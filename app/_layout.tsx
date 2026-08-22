import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { clearLocalStorageNotice, getLocalStorageNotice, loadLocalState } from "@/lib/local-store";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    initManusRuntime();
    // Run one safe local-store health check at startup. It never resets user data.
    loadLocalState().then(() => {
      const notice = getLocalStorageNotice();
      if (notice && !notice.startsWith("تم إنشاء البيانات الافتراضية")) setStorageNotice(notice);
    }).catch(() => {
      setStorageNotice("تعذر فحص قاعدة البيانات المحلية. لم يتم استبدال أي بيانات.");
    });
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }));
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {storageNotice ? (
            <View style={styles.notice}>
              <View style={styles.noticeTextWrap}>
                <Text style={styles.noticeTitle}>تنبيه قاعدة البيانات</Text>
                <Text style={styles.noticeText}>{storageNotice}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  clearLocalStorageNotice();
                  setStorageNotice("");
                }}
                style={styles.noticeClose}
              >
                <Text style={styles.noticeCloseText}>إغلاق</Text>
              </Pressable>
            </View>
          ) : null}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";
  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  notice: {
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff3cd",
    borderBottomWidth: 1,
    borderBottomColor: "#e5b94f",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    zIndex: 9999,
  },
  noticeTextWrap: { flex: 1, alignItems: "flex-end" },
  noticeTitle: { fontSize: 14, fontWeight: "800", color: "#7a4f00", textAlign: "right" },
  noticeText: { marginTop: 2, fontSize: 12, lineHeight: 18, color: "#5d4a22", textAlign: "right" },
  noticeClose: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: "#fff" },
  noticeCloseText: { fontSize: 12, fontWeight: "700", color: "#7a4f00" },
});
