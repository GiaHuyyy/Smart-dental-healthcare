# 🎨 Design System Demo & Usage Guide

> **Mục đích:** Hướng dẫn sử dụng Design System mới cho Mobile App
> 
> **Status:** ✅ Core components completed

---

## 📦 Đã hoàn thành

### Design Tokens ✅
- ✅ `constants/colors.ts` - Color palette
- ✅ `constants/spacing.ts` - Spacing scale
- ✅ `constants/typography.ts` - Typography system
- ✅ `constants/shadows.ts` - Shadows & elevation

### Layout Components ✅
- ✅ `components/layout/AppHeader.tsx` - Modern header
- ✅ `components/layout/SafeContainer.tsx` - Safe area container

### UI Components ✅
- ✅ `components/ui/Card.tsx` - Elevated card
- ✅ `components/ui/Button.tsx` - Multiple button variants
- ✅ `components/ui/Badge.tsx` - Status badges
- ✅ `components/ui/SectionHeader.tsx` - Section dividers
- ✅ `components/ui/EmptyState.tsx` - Empty state placeholder

---

## 🎯 Cách sử dụng

### 1. AppHeader - Modern App Header

```tsx
import { AppHeader } from '@/components/layout/AppHeader';

// Basic usage
<AppHeader 
  title="Trang chủ"
  showNotification
  showAvatar
  notificationCount={3}
/>

// With back button
<AppHeader 
  title="Chi tiết lịch hẹn"
  showBack
  onBackPress={() => router.back()}
/>

// With search
<AppHeader 
  title="Tìm bác sĩ"
  showSearch
  onSearchPress={() => setShowSearch(true)}
/>

// With gradient
<AppHeader 
  title="Trang chủ"
  gradient
  showNotification
  showAvatar
/>

// With custom right component
<AppHeader 
  title="Lịch hẹn"
  rightComponent={
    <Pressable onPress={handleFilter}>
      <Ionicons name="filter" size={22} />
    </Pressable>
  }
/>
```

---

### 2. SafeContainer - Container với Safe Area

```tsx
import { SafeContainer } from '@/components/layout/SafeContainer';

// Scrollable container với padding
<SafeContainer scrollable padding>
  <Text>Content here...</Text>
</SafeContainer>

// Non-scrollable với custom background
<SafeContainer 
  backgroundColor="#f0f9ff"
  paddingHorizontal
>
  <Text>Static content</Text>
</SafeContainer>

// Custom edges
<SafeContainer 
  scrollable
  edges={['top']} // Only top safe area
>
  <Text>Content</Text>
</SafeContainer>
```

---

### 3. Card - Elevated Card Component

```tsx
import { Card } from '@/components/ui/Card';

// Basic card
<Card>
  <Text>Card content</Text>
</Card>

// Card with custom shadow
<Card shadow="md">
  <Text>Medium shadow</Text>
</Card>

// Card with gradient
<Card 
  gradient
  gradientColors={['#3b82f6', '#2563eb']}
>
  <Text className="text-white">Gradient card</Text>
</Card>

// Pressable card
<Card 
  onPress={() => router.push('/details')}
  shadow="lg"
>
  <Text>Tap me!</Text>
</Card>

// Custom padding & border radius
<Card 
  padding="lg"
  borderRadius="2xl"
>
  <Text>Custom spacing</Text>
</Card>
```

---

### 4. Button - Multiple Variants

```tsx
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

// Primary button
<Button 
  variant="primary"
  onPress={handleSubmit}
>
  Xác nhận
</Button>

// Secondary button
<Button 
  variant="secondary"
  onPress={handleCancel}
>
  Hủy
</Button>

// Outline button
<Button 
  variant="outline"
  onPress={handleEdit}
>
  Chỉnh sửa
</Button>

// Ghost button
<Button 
  variant="ghost"
  onPress={handleMore}
>
  Xem thêm
</Button>

// Danger button
<Button 
  variant="danger"
  onPress={handleDelete}
>
  Xóa
</Button>

// With icon (left)
<Button 
  variant="primary"
  icon={<Ionicons name="add" size={20} color="white" />}
  iconPosition="left"
>
  Thêm mới
</Button>

// With icon (right)
<Button 
  variant="outline"
  icon={<Ionicons name="arrow-forward" size={20} color="#3b82f6" />}
  iconPosition="right"
>
  Tiếp tục
</Button>

// Loading state
<Button 
  variant="primary"
  loading={isSubmitting}
>
  Đang xử lý...
</Button>

// Disabled state
<Button 
  variant="primary"
  disabled
>
  Không khả dụng
</Button>

// Full width
<Button 
  variant="primary"
  fullWidth
>
  Đăng nhập
</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

---

### 5. Badge - Status Indicators

```tsx
import { Badge } from '@/components/ui/Badge';

// Primary badge
<Badge variant="primary">Mới</Badge>

// Success badge
<Badge variant="success">Hoàn thành</Badge>

// Warning badge
<Badge variant="warning">Chờ xử lý</Badge>

// Error badge
<Badge variant="error">Đã hủy</Badge>

// Gray badge
<Badge variant="gray">Nháp</Badge>

// With dot indicator
<Badge variant="success" dot>
  Đang hoạt động
</Badge>

// Different sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

---

### 6. SectionHeader - Section Dividers

```tsx
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Ionicons } from '@expo/vector-icons';

// Basic header
<SectionHeader title="Hoạt động gần đây" />

// With subtitle
<SectionHeader 
  title="Lịch hẹn"
  subtitle="3 lịch hẹn sắp tới"
/>

// With action button
<SectionHeader 
  title="Bác sĩ nổi bật"
  action={{
    label: 'Xem tất cả',
    onPress: () => router.push('/doctors')
  }}
/>

// With icon
<SectionHeader 
  title="Thông báo"
  icon={<Ionicons name="notifications" size={20} color="#3b82f6" />}
/>
```

---

### 7. EmptyState - Empty Placeholders

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

// Basic empty state
<EmptyState 
  title="Không có dữ liệu"
  description="Chưa có thông tin nào được tạo"
/>

// With icon
<EmptyState 
  icon={<Ionicons name="calendar-outline" size={64} color="#d1d5db" />}
  title="Chưa có lịch hẹn"
  description="Bạn chưa đặt lịch hẹn nào"
/>

// With action button
<EmptyState 
  icon={<Ionicons name="calendar" size={64} color="#d1d5db" />}
  title="Chưa có lịch hẹn"
  description="Đặt lịch khám ngay để được tư vấn"
  action={{
    label: 'Đặt lịch ngay',
    onPress: () => router.push('/appointments/create')
  }}
/>
```

---

## 🎨 Complete Screen Example

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SafeContainer } from '@/components/layout/SafeContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';

export default function ModernScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);

  return (
    <>
      {/* Modern Header */}
      <AppHeader 
        title="Lịch hẹn"
        showNotification
        showAvatar
        notificationCount={3}
      />

      <SafeContainer scrollable>
        {/* Hero Card with Gradient */}
        <Card 
          gradient
          gradientColors={[Colors.primary[600], Colors.primary[700]]}
          className="mb-6"
        >
          <Text className="text-white text-2xl font-bold mb-2">
            Chào mừng trở lại!
          </Text>
          <Text className="text-white/80 mb-4">
            Bạn có 2 lịch hẹn sắp tới
          </Text>
          
          <View className="flex-row gap-3">
            <Button 
              variant="secondary"
              size="sm"
              icon={<Ionicons name="add" size={18} color="#3b82f6" />}
              onPress={() => router.push('/appointments/create')}
            >
              Đặt lịch mới
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              className="opacity-80"
            >
              <Text className="text-white">Xem tất cả</Text>
            </Button>
          </View>
        </Card>

        {/* KPI Cards */}
        <View className="flex-row gap-4 mb-6">
          <Card className="flex-1" shadow="md">
            <View className="items-center">
              <Ionicons name="calendar" size={28} color={Colors.primary[600]} />
              <Text className="text-2xl font-bold mt-2">12</Text>
              <Text className="text-gray-500 text-sm">Đã hoàn thành</Text>
            </View>
          </Card>
          
          <Card className="flex-1" shadow="md">
            <View className="items-center">
              <Ionicons name="time" size={28} color={Colors.warning[500]} />
              <Text className="text-2xl font-bold mt-2">2</Text>
              <Text className="text-gray-500 text-sm">Sắp tới</Text>
            </View>
          </Card>
        </View>

        {/* Section with Header */}
        <SectionHeader 
          title="Lịch hẹn gần đây"
          subtitle="Cập nhật mới nhất"
          action={{
            label: 'Xem tất cả',
            onPress: () => router.push('/appointments/all')
          }}
          icon={<Ionicons name="time-outline" size={20} color={Colors.primary[600]} />}
        />

        {/* List */}
        {appointments.length > 0 ? (
          <View className="space-y-3">
            {appointments.map((appointment) => (
              <Card 
                key={appointment.id}
                onPress={() => router.push(`/appointments/${appointment.id}`)}
                shadow="sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-base mb-1">
                      {appointment.doctorName}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {appointment.date} • {appointment.time}
                    </Text>
                  </View>
                  <Badge variant="success" dot>
                    Đã xác nhận
                  </Badge>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState 
            icon={<Ionicons name="calendar-outline" size={64} color={Colors.gray[300]} />}
            title="Chưa có lịch hẹn"
            description="Đặt lịch khám ngay để được tư vấn"
            action={{
              label: 'Đặt lịch ngay',
              onPress: () => router.push('/appointments/create')
            }}
          />
        )}

        {/* Bottom Action */}
        <View className="mt-6">
          <Button 
            variant="primary"
            fullWidth
            size="lg"
            icon={<Ionicons name="add-circle-outline" size={24} color="white" />}
            onPress={() => router.push('/appointments/create')}
          >
            Đặt lịch hẹn mới
          </Button>
        </View>
      </SafeContainer>
    </>
  );
}
```

---

## 🎨 Color Usage Examples

```tsx
import { Colors } from '@/constants/colors';

// Primary colors
<View style={{ backgroundColor: Colors.primary[500] }}>
<Text style={{ color: Colors.primary[700] }}>

// Semantic colors
<View style={{ backgroundColor: Colors.success[50] }}>
<Text style={{ color: Colors.success[700] }}>Success</Text>

<View style={{ backgroundColor: Colors.warning[50] }}>
<Text style={{ color: Colors.warning[700] }}>Warning</Text>

<View style={{ backgroundColor: Colors.error[50] }}>
<Text style={{ color: Colors.error[700] }}>Error</Text>

// Theme-aware colors
const theme = Colors[colorScheme ?? 'light'];
<View style={{ backgroundColor: theme.background }}>
<Text style={{ color: theme.text.primary }}>
```

---

## 📏 Spacing Usage Examples

```tsx
import { Spacing } from '@/constants/spacing';

// Padding
<View style={{ padding: Spacing.base }}>
<View style={{ paddingHorizontal: Spacing.lg }}>
<View style={{ paddingVertical: Spacing.md }}>

// Margin
<View style={{ marginBottom: Spacing.xl }}>
<View style={{ marginTop: Spacing.sm }}>

// Gap (với flexbox)
<View style={{ gap: Spacing.base }}>
```

---

## 📝 Typography Usage Examples

```tsx
import { TypographyPresets } from '@/constants/typography';

// Using presets
<Text style={TypographyPresets.h1}>Heading 1</Text>
<Text style={TypographyPresets.h2}>Heading 2</Text>
<Text style={TypographyPresets.body}>Body text</Text>
<Text style={TypographyPresets.caption}>Caption</Text>

// Using individual values
import { Typography } from '@/constants/typography';

<Text style={{ 
  fontSize: Typography.fontSize.xl,
  fontWeight: Typography.fontWeight.bold 
}}>
```

---

## 🌟 Shadows Usage Examples

```tsx
import { Shadows } from '@/constants/shadows';

// Apply shadow to View
<View style={Shadows.sm}>
<View style={Shadows.md}>
<View style={Shadows.lg}>

// Combine with other styles
<View style={[
  Shadows.md,
  { backgroundColor: 'white', borderRadius: 12 }
]}>
```

---

## ✅ Best Practices

### 1. **Always use design tokens**
```tsx
// ❌ Bad
<View style={{ padding: 16 }}>

// ✅ Good
<View style={{ padding: Spacing.base }}>
```

### 2. **Use theme colors for dynamic theming**
```tsx
// ❌ Bad
<Text style={{ color: '#111827' }}>

// ✅ Good
const theme = Colors[colorScheme ?? 'light'];
<Text style={{ color: theme.text.primary }}>
```

### 3. **Compose components properly**
```tsx
// ❌ Bad - Recreating styles
<View style={{ 
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOpacity: 0.1
}}>

// ✅ Good - Use Card component
<Card>
  {content}
</Card>
```

### 4. **Use SafeContainer for screens**
```tsx
// ❌ Bad
<View style={{ flex: 1 }}>
  <ScrollView>
    <View style={{ padding: 16 }}>

// ✅ Good
<SafeContainer scrollable padding>
```

### 5. **Consistent spacing**
```tsx
// ❌ Bad - Random spacing
<View style={{ marginBottom: 18 }}>
<View style={{ gap: 15 }}>

// ✅ Good - Use spacing scale
<View style={{ marginBottom: Spacing.lg }}>
<View style={{ gap: Spacing.base }}>
```

---

## 📚 Next Steps

1. **Refactor existing screens** to use new components
2. **Create more specialized components** (FAB, Avatar, etc.)
3. **Add animations** to components
4. **Create drawer navigation**
5. **Update tab bar** to 4-5 items only

---

**Happy coding! 🚀**
