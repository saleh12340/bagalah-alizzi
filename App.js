import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, SafeAreaView, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

export default function App() {
  const webRef = useRef(null);
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const asset = Asset.fromModule(require("./web/index.html"));
        await asset.downloadAsync();
        if (mounted) setUri(asset.localUri || asset.uri);
      } catch (e) {
        console.warn("HTML asset load failed", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data || "{}");
      if (msg.type === "print") {
        await Print.printAsync({ html: msg.html || "" });
      } else if (msg.type === "sharePdf") {
        const result = await Print.printToFileAsync({ html: msg.html || "" });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "application/pdf",
            dialogTitle: "مشاركة الفاتورة"
          });
        }
      } else if (msg.type === "shareText") {
        if (await Sharing.isAvailableAsync()) {
          const file = new File(Paths.cache, msg.name || "بيان-بقالة-العزي.txt");
          if (file.exists) file.delete();
          file.create();
          file.write(String(msg.text || ""));
          await Sharing.shareAsync(file.uri, {
            mimeType: "text/plain",
            dialogTitle: "مشاركة البيان"
          });
        }
      } else if (msg.type === "backup") {
        const file = new File(Paths.cache, "bagalah-alizzi-backup.json");
        if (file.exists) file.delete();
        file.create();
        file.write(String(msg.data || "{}"));
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "application/json",
            dialogTitle: "نسخة احتياطية لبيانات بقالة العزي"
          });
        }
      } else if (msg.type === "call" && msg.phone) {
        await Linking.openURL("tel:" + String(msg.phone).replace(/[^0-9+]/g, ""));
      } else if (msg.type === "whatsapp" && msg.phone) {
        const phone = String(msg.phone).replace(/[^0-9]/g, "");
        const text = encodeURIComponent(msg.text || "");
        await Linking.openURL("https://wa.me/" + phone + "?text=" + text);
      }
    } catch (e) {
      console.warn("Native bridge error", e);
    }
  };

  if (!uri) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color="#126B4A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <WebView
        ref={webRef}
        source={{ uri }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        mixedContentMode="compatibility"
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        nestedScrollEnabled
        overScrollMode="never"
        bounces={false}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        onRenderProcessGone={() => webRef.current?.reload()}
        style={styles.web}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F4" },
  web: { flex: 1, backgroundColor: "#F4F7F4" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7F4" }
});