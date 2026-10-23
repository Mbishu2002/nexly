import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Icon, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { Thread } from "@/lib/api/types";

/* A conversation is a stack route, NOT a tab.
 *
 * Living outside the (tabs) group is what hides the bottom tab bar: a chat
 * wants the full height for the thread and keyboard, and the composer would
 * otherwise sit on top of the tab bar. Same reason the list stays a tab and
 * only the conversation pushes. */
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useI18n();

  const query = useQuery((o) => api.getThread(id, o), [id]);
  // Writes replace the server copy locally so the thread updates immediately.
  const [override, setOverride] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");

  const send = async (thread: Thread) => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setOverride(await api.sendMessage(thread.id, text, { locale }));
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={query}>
        {(fetched) => {
          if (!fetched) {
            return (
              <View style={s.missing}>
                <Icon name="forum" size={28} color={colors.onSurfaceVariant} />
                <Txt variant="caption" color={colors.onSurfaceVariant}>
                  {t("messages", "empty")}
                </Txt>
              </View>
            );
          }
          const thread = override ?? fetched;

          return (
            <>
              <View style={s.appbar}>
                <Pressable hitSlop={8} onPress={() => router.back()}>
                  <Icon name="arrow-back" size={22} />
                </Pressable>
                <Avatar name={thread.name} uri={thread.avatar} size={34} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subheading" numberOfLines={1}>
                    {thread.name}
                  </Txt>
                  <Txt variant="micro" color={colors.tertiary} style={{ fontWeight: "400" }}>
                    {t("messages", "online")}
                  </Txt>
                </View>
                <Pressable hitSlop={8} onPress={() => router.push(`/classroom/${thread.teacherId}`)}>
                  <Icon name="videocam" size={22} color={colors.primary} />
                </Pressable>
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView contentContainerStyle={s.thread} showsVerticalScrollIndicator={false}>
                  {thread.messages.map((m, i) => (
                    <View key={i} style={[s.bubbleRow, m.from === "me" && s.bubbleRowMe]}>
                      <View style={[s.bubble, m.from === "me" ? s.bubbleMe : s.bubbleThem]}>
                        <Txt
                          variant="body"
                          color={m.from === "me" ? colors.onPrimary : colors.onSurface}
                        >
                          {m.text}
                        </Txt>
                        <Txt
                          variant="micro"
                          color={m.from === "me" ? colors.primaryFixedDim : colors.onSurfaceVariant}
                          style={{ fontWeight: "400", marginTop: 3 }}
                        >
                          {m.time}
                        </Txt>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <SafeAreaView edges={["bottom"]} style={s.composer}>
                  <View style={s.composerInner}>
                    <Pressable hitSlop={8}>
                      <Icon name="attach-file" size={20} color={colors.onSurfaceVariant} />
                    </Pressable>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={t("messages", "placeholder")}
                      placeholderTextColor={colors.onSurfaceVariant}
                      style={s.composerInput}
                      onSubmitEditing={() => send(thread)}
                      returnKeyType="send"
                    />
                    <Pressable onPress={() => send(thread)} style={s.send} hitSlop={6}>
                      <Icon name="send" size={18} color={colors.onPrimary} />
                    </Pressable>
                  </View>
                </SafeAreaView>
              </KeyboardAvoidingView>
            </>
          );
        }}
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
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  thread: { padding: 16, gap: 10 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: colors.surfaceContainerHigh, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  composer: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  composerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.onSurface,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
