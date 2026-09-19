import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Alert, BackHandler, I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { clearLocalStorageNotice, getLocalStorageNotice, loadLocalState } from "@/lib/local-store";

// load Cairo font
import { useFonts, Cairo_400Regular, Cairo_700Bold } from "@expo-google-fonts/cairo";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };
export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  const router = useRouter();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const [storageNotice, setStorageNotice] = useState("");

  // Ask for confirmation before closing the Android app when the user is at the root screen.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      // If there is a previous route, let Expo Router handle normal navigation first.
      // Note: router isn't available in this file in all stacks; keep behavior generic.
      Alert.alert(
        "تأكيد الخروج",
        "هل تريد الخروج من البرنامج؟",
        [
          {
            text: "لا",
            style: "cancel",
          },
          {
            text: "نعم، خروج",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
        ],
        { cancelable: true },
      );

      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const onBackPress = () => {
      if (router.canGoBack()) return false;
      Alert.alert("تأكيد الخروج", "هل تريد الخروج من البرنامج؟", [
        { text: "لا", style: "cancel" },
        { text: "نعم، خروج", style: "destructive", onPress: () => BackHandler.exitApp() },
      ], { cancelable: true });
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [router]);

  useEffect(() => { initManusRuntime(); }, []);
  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => { setInsets(metrics.insets); setFrame(metrics.frame); }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return { ...metrics, insets: { ...metrics.insets, top: Math.max(metrics.insets.top, 16), bottom: Math.max(metrics.insets.bottom, 12) } };
  }, [initialInsets, initialFrame]);

  // load font (Cairo) and ensure RTL
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_700Bold });

  useEffect(() => {
    // Force RTL for Arabic app; this may require app reload to fully apply.
    try {
      if (!I18nManager.isRTL) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(true);
      }
    } catch (e) {
      // ignore if not supported at runtime
      console.warn("RTL force failed", e);
    }
  }, []);

  if (!fontsLoaded) {
    // simple early return; splash screen handled elsewhere
    return null;
  }

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return <ThemeProvider><SafeAreaProvider initialMetrics={providerInitialMetrics}><SafeAreaFrameContext.Provider value={frame}><SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider></SafeAreaFrameContext.Provider></SafeAreaProvider></ThemeProvider>;
  }
  return <ThemeProvider><SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider></ThemeProvider>;
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
