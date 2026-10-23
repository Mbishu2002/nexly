import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LocaleProvider } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  // No `initial` prop: the provider resolves stored choice → device language → fr.
  return (
    <LocaleProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          {/* Learner side */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="teacher/[id]" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="book/[id]" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="review/[id]" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="quiz/[id]" options={{ animation: "slide_from_bottom" }} />

          {/* Chat lives outside (tabs) so no tab bar sits under the composer */}
          <Stack.Screen name="chat/[id]" />

          {/* Shared: the live session is full-screen on a dark surface */}
          <Stack.Screen name="classroom/[id]" options={{ animation: "fade" }} />
          <Stack.Screen name="report/[id]" options={{ animation: "slide_from_bottom" }} />

          {/* Teacher side */}
          <Stack.Screen name="apply" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="(teacher)" />
        </Stack>
      </SafeAreaProvider>
    </LocaleProvider>
  );
}
