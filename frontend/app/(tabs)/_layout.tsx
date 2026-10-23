import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { colors, type as t } from "@/lib/theme";

export default function TabsLayout() {
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
        tabBarBadgeStyle: {
          backgroundColor: colors.error,
          color: colors.onError,
          fontSize: 10,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: tr("tabs", "discover"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="explore" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: tr("tabs", "lessons"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: tr("tabs", "messages"),
          tabBarBadge: 2,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr("tabs", "profile"),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
