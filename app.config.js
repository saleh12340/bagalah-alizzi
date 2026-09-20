const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function(config) {
  config = {
    ...config,
    name: "بقالة العزي للمواد الغذائية",
    slug: "bagalah-alizzi",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    backgroundColor: "#F4F7F4",
    primaryColor: "#126B4A",
    android: {
      ...(config.android || {}),
      package: "com.app.bagalahalizzi",
      versionCode: 200,
      adaptiveIcon: {
        backgroundColor: "#F4F7F4",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      softwareKeyboardLayoutMode: "resize",
      statusBar: {
        barStyle: "light-content",
        backgroundColor: "#0B4D36",
        translucent: false
      },
      navigationBar: {
        backgroundColor: "#F4F7F4",
        barStyle: "dark-content",
        enforceContrast: false
      },
      permissions: ["POST_NOTIFICATIONS"]
    },
    plugins: [
      "expo-asset",
      "expo-print",
      "expo-sharing",
      ["expo-build-properties", {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "35.0.0",
          minSdkVersion: 24
        }
      }]
    ],
    experiments: { reactCompiler: false }
  };
  return config;
};