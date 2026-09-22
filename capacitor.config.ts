import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ziyabaran.akademi',
  appName: 'Ziya Baran Akademi',
  webDir: 'public',
  server: {
    url: 'https://ziya-baran-akademi.vercel.app',
    cleartext: true,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
    },
  },
};

export default config;
