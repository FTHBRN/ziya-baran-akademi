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
};

export default config;
