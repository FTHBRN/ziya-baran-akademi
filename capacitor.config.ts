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
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b132b',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b132b',
    },
  },
};

export default config;
