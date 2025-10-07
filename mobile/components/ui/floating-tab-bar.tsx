import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const palette = Colors[scheme ?? 'light'];

  const animatedValuesRef = useRef<Animated.Value[]>([]);
  if (animatedValuesRef.current.length !== state.routes.length) {
    animatedValuesRef.current = state.routes.map((_, index) =>
      animatedValuesRef.current[index] ?? new Animated.Value(state.index === index ? 1 : 0),
    );
  }

  useEffect(() => {
    state.routes.forEach((_, index) => {
      Animated.spring(animatedValuesRef.current[index], {
        toValue: state.index === index ? 1 : 0,
        useNativeDriver: true,
        stiffness: 220,
        damping: 22,
        mass: 0.6,
      }).start();
    });
  }, [state.index, state.routes]);

  const { activeColor, inactiveColor, gradientColors, borderColor, activeBackground, activeIndicator, dotColor } = useMemo(() => {
    const isDark = scheme === 'dark';
    return {
      activeColor: palette.tabIconSelected,
      inactiveColor: palette.tabIconDefault,
      gradientColors: (isDark
        ? ['rgba(15, 23, 42, 0.96)', 'rgba(15, 23, 42, 0.86)']
        : ['rgba(241, 245, 249, 0.95)', 'rgba(248, 250, 252, 0.95)']) as [string, string],
      borderColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.35)',
      activeBackground: isDark ? 'rgba(148, 197, 253, 0.18)' : 'rgba(10, 126, 164, 0.16)',
      activeIndicator: isDark ? 'rgba(148, 197, 253, 0.28)' : 'rgba(14, 165, 233, 0.18)',
      dotColor: isDark ? '#bae6fd' : '#0284c7',
    };
  }, [palette.tabIconDefault, palette.tabIconSelected, scheme]);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderColor }]}
      >
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const icon = options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? activeColor : inactiveColor,
              size: 22,
            });

            const progress = animatedValuesRef.current[index];
            const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
            const haloScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
            const haloOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
            const dotOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }

              if (process.env.EXPO_OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[styles.tabButton, isFocused && { backgroundColor: activeBackground }]}
                activeOpacity={0.9}
              >
                <View style={styles.iconWrapper}>
                  <Animated.View
                    style={[styles.activeIndicator, { backgroundColor: activeIndicator, opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
                  />
                  <Animated.View style={{ transform: [{ scale }] }}>{icon}</Animated.View>
                </View>
                <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: dotOpacity }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  gradient: {
  borderRadius: 26,
  paddingHorizontal: 12,
  paddingVertical: -5,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 20,
    elevation: 8,
    width: '92%',
    maxWidth: 360,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
  borderRadius: 18,
  paddingVertical: 8,
  marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
  height: 38,
  width: 38,
  borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  borderRadius: 19,
  },
  dot: {
  marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
