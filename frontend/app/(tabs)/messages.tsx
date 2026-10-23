import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Icon, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

/* Thread list only. The conversation itself lives at app/chat/[id].tsx, which
 * sits outside the (tabs) group so the bottom tab bar is not drawn over the
 * composer. */
export default function Messages() {
  const { t } = useI18n();
  const router = useRouter();
  const query = useQuery((o) => api.listThreads(o));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Txt variant="title">{t("messages", "title")}</Txt>
      </View>
      <Loader query={query}>
        {(list) => (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {list.map((x) => (
              <Pressable
                key={x.id}
                onPress={() => router.push(`/chat/${x.id}`)}
                style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
              >
                <Avatar name={x.name} uri={x.avatar} size={48} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={s.rowTop}>
                    <Txt variant="subheading" numberOfLines={1} style={{ flex: 1 }}>
                      {x.name}
                    </Txt>
                    <Txt
                      variant="micro"
                      color={colors.onSurfaceVariant}
                      style={{ fontWeight: "400" }}
                    >
                      {x.time}
                    </Txt>
                  </View>
                  <View style={s.rowTop}>
                    <Txt
                      variant="caption"
                      color={colors.onSurfaceVariant}
                      numberOfLines={1}
                      style={{ flex: 1, fontWeight: "400" }}
                    >
                      {x.preview}
                    </Txt>
                    {x.unread ? (
                      <View style={s.badge}>
                        <Txt variant="micro" color={colors.onError}>
                          {x.unread}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            ))}
            {list.length === 0 ? (
              <View style={s.empty}>
                <Icon name="forum" size={28} color={colors.onSurfaceVariant} />
                <Txt variant="caption" color={colors.onSurfaceVariant}>
                  {t("messages", "empty")}
                </Txt>
              </View>
            ) : null}
          </ScrollView>
        )}
      </Loader>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  list: { padding: 16, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", gap: 8, paddingVertical: 40 },
});
