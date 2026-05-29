import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.BEAUTY_BOAT_APP_URL || "http://192.168.1.21:3000";

const config: CapacitorConfig = {
  appId: "com.beautyboat.orders",
  appName: "Beauty Boat",
  webDir: "public",
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith("http://"),
  },
  android: {
    allowMixedContent: appUrl.startsWith("http://"),
  },
};

export default config;
