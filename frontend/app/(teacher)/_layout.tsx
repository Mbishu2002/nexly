import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { colors, type as t } from "@/lib/theme";

export default function TeacherTabsLayout() {
  const insets = useSafeAreaInsets();
  const { t: tr } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLowest,
          borderTopColor: colors.outlineVariant,
          // Android 16 makes edge-to-edge mandatory, so the gesture bar draws
          // over the tab bar unless we grow it by the bottom inset. On devices
          // with 3-button nav this inset is taller; on none it is 0.
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { ...t.micro, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="schedule"
        options={{
          title: tr("tabs", "planning"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: tr("tabs", "learners"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: tr("tabs", "revenue"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="payments" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: tr("tabs", "profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
