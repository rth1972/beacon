import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beacon.app',
  appName: 'Beacon',
  webDir: 'android-app/www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
