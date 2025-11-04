const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add resolver to handle platform-specific modules
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Redirect react-native-webrtc to web stub on web platform
    if (platform === 'web' && moduleName === 'react-native-webrtc') {
      return {
        filePath: require.resolve('./services/webrtc.web.ts'),
        type: 'sourceFile',
      };
    }
    // Default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });