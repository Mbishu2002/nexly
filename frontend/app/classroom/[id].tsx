import { useEffect, useRef, useState } from "react";
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
import { Avatar, Icon, Txt, type IconName } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { SessionNote } from "@/lib/api/types";

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function Classroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const query = useQuery((o) => api.getClassroomSession(id, o), [id]);

  const [elapsed, setElapsed] = useState<number | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [extraNotes, setExtraNotes] = useState<SessionNote[]>([]);
  const [draft, setDraft] = useState("");
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = query.data;

  // Seed the clock from the server, then run it locally.
  useEffect(() => {
    if (session && elapsed === null) setElapsed(session.elapsedSeconds);
  }, [session, elapsed]);

  useEffect(() => {
    if (elapsed === null || !session) return;
    const timer = setInterval(
      () => setElapsed((e) => (e === null ? e : Math.min(session.lengthSeconds, e + 1))),
      1000,
    );
    return () => clearInterval(timer);
  }, [elapsed === null, session?.lengthSeconds]);

  useEffect(
    () => () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    },
    [],
  );

  const react = (emoji: string) => {
    setReaction(emoji);
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), 1800);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={query}>
        {(data) => {
          const notes = [...data.notes, ...extraNotes];
          const word = activeWord ?? data.phoneticGuide.target;

          const send = () => {
            const text = draft.trim();
            if (!text) return;
            setExtraNotes((prev) => [
              ...prev,
              { from: "me", author: `${t("classroom", "you")} (${data.student})`, text },
            ]);
            setDraft("");
          };

          return (
            <>
              <View style={s.appbar}>
                <Pressable hitSlop={8} onPress={() => router.back()}>
                  <Icon name="arrow-back" size={22} color={colors.inverseOnSurface} />
                </Pressable>
                <Txt variant="heading" color={colors.inverseOnSurface} style={{ flex: 1 }}>
                  {t("classroom", "title")}
                </Txt>
                <View style={s.rec}>
                  <View style={s.recDot} />
                  <Txt variant="micro" color={colors.onError}>
                    {t("classroom", "rec")}
                  </Txt>
                </View>
              </View>

              <View style={s.statusBar}>
                <Txt variant="micro" color={colors.inverseOnSurface}>
                  {mmss(elapsed ?? data.elapsedSeconds)} / {mmss(data.lengthSeconds)}
                </Txt>
                <View style={s.statusRight}>
                  <Icon name="signal-cellular-alt" size={14} color={colors.tertiaryFixedDim} />
                  <Txt variant="micro" color={colors.tertiaryFixedDim} style={{ fontWeight: "400" }}>
                    {data.latency}
                  </Txt>
                </View>
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                  {/* Video stage. Real LiveKit tracks replace these placeholders. */}
                  <View style={s.stage}>
                    <View style={s.remoteTile}>
                      <Avatar name={data.teacher} size={64} />
                      <Txt variant="caption" color={colors.inverseOnSurface}>
                        {data.teacher}
                      </Txt>
                      <View style={s.tileBadge}>
                        <Icon name="volume-up" size={13} color={colors.onTertiaryFixed} />
                        <Txt variant="micro" color={colors.onTertiaryFixed}>
                          {t("classroom", "speaking")}
                        </Txt>
                      </View>
                    </View>

                    <View style={s.selfTile}>
                      {camOn ? (
                        <Avatar name={data.student} size={34} />
                      ) : (
                        <Icon name="videocam-off" size={20} color={colors.inverseOnSurface} />
                      )}
                      <View style={s.selfLabel}>
                        <Icon
                          name={micOn ? "mic" : "mic-off"}
                          size={11}
                          color={micOn ? colors.tertiaryFixedDim : colors.errorContainer}
                        />
                        <Txt variant="micro" color={colors.inverseOnSurface}>
                          {t("classroom", "you")}
                        </Txt>
                      </View>
                    </View>

                    {reaction ? (
                      <View style={s.reactionFloat}>
                        <Txt variant="display">{reaction}</Txt>
                      </View>
                    ) : null}
                  </View>

                  {/* Shared whiteboard — the teaching surface. */}
                  <View style={s.board}>
                    <View style={s.boardHead}>
                      <Icon name="draw" size={16} color={colors.onSurfaceVariant} />
                      <Txt variant="micro" style={{ flex: 1 }}>
                        {data.boardTitle}
                      </Txt>
                      <View style={s.boardTag}>
                        <Icon name="volume-up" size={12} color={colors.onPrimaryFixed} />
                        <Txt variant="micro" color={colors.onPrimaryFixed}>
                          {t("classroom", "phonetics")}
                        </Txt>
                      </View>
                    </View>

                    <View style={s.vocab}>
                      {data.vocab.map((v) => {
                        const on = word === v.word;
                        return (
                          <Pressable
                            key={v.word}
                            onPress={() => setActiveWord(v.word)}
                            style={({ pressed }) => [
                              s.vocabRow,
                              on && s.vocabRowOn,
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <Txt
                              variant="subheading"
                              color={on ? colors.onPrimaryFixed : colors.onSurface}
                            >
                              {v.word}
                            </Txt>
                            <Txt
                              variant="caption"
                              color={colors.onSurfaceVariant}
                              style={{ flex: 1, fontWeight: "400" }}
                            >
                              ({v.gloss})
                            </Txt>
                            <Icon
                              name="volume-up"
                              size={16}
                              color={on ? colors.primary : colors.onSurfaceVariant}
                            />
                          </Pressable>
                        );
                      })}
                    </View>

                    {word === data.phoneticGuide.target ? (
                      <View style={s.guide}>
                        <Txt variant="micro" color={colors.onTertiaryFixed}>
                          {t("classroom", "guideTitle")}
                        </Txt>
                        <Txt variant="subheading" color={colors.onTertiaryFixed}>
                          {data.phoneticGuide.ipa}
                        </Txt>
                        <Txt
                          variant="micro"
                          color={colors.onTertiaryFixedVariant}
                          style={{ fontWeight: "400" }}
                        >
                          {data.phoneticGuide.hint}
                        </Txt>
                      </View>
                    ) : null}
                  </View>

                  <View style={s.reactions}>
                    {["👏", "❤️", "✅"].map((e) => (
                      <Pressable key={e} onPress={() => react(e)} style={s.reactionBtn}>
                        <Txt variant="heading">{e}</Txt>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setHandRaised((v) => !v)}
                      style={[s.raise, handRaised && s.raiseOn]}
                    >
                      <Icon
                        name="front-hand"
                        size={17}
                        color={handRaised ? colors.onSecondary : colors.onSurfaceVariant}
                      />
                      <Txt
                        variant="micro"
                        color={handRaised ? colors.onSecondary : colors.onSurfaceVariant}
                      >
                        {handRaised ? t("classroom", "raised") : t("classroom", "raise")}
                      </Txt>
                    </Pressable>
                  </View>

                  <View style={s.notes}>
                    <View style={s.notesHead}>
                      <Icon name="sticky-note-2" size={16} color={colors.onSurfaceVariant} />
                      <Txt variant="micro" style={{ flex: 1 }}>
                        {t("classroom", "notesTitle")}
                      </Txt>
                      <Txt variant="micro" color={colors.tertiary} style={{ fontWeight: "400" }}>
                        {t("classroom", "autosaved")}
                      </Txt>
                    </View>

                    {notes.map((n, i) => (
                      <View key={i} style={s.note}>
                        <Avatar name={n.from === "me" ? data.student : data.teacher} size={28} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt variant="micro" color={colors.onSurfaceVariant}>
                            {n.author}
                          </Txt>
                          <Txt variant="caption" style={{ lineHeight: 18, fontWeight: "400" }}>
                            {n.text}
                          </Txt>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <SafeAreaView edges={["bottom"]} style={s.bottom}>
                  <View style={s.composer}>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={t("classroom", "notePlaceholder")}
                      placeholderTextColor={colors.onSurfaceVariant}
                      style={s.composerInput}
                      onSubmitEditing={send}
                      returnKeyType="send"
                    />
                    <Pressable onPress={send} style={s.send} hitSlop={6}>
                      <Icon name="send" size={17} color={colors.onPrimary} />
                    </Pressable>
                  </View>

                  <View style={s.controls}>
                    <ControlButton
                      icon={micOn ? "mic" : "mic-off"}
                      active={micOn}
                      onPress={() => setMicOn((v) => !v)}
                    />
                    <ControlButton
                      icon={camOn ? "videocam" : "videocam-off"}
                      active={camOn}
                      onPress={() => setCamOn((v) => !v)}
                    />
                    <ControlButton icon="border-color" active={false} onPress={() => {}} />
                    <ControlButton icon="cameraswitch" active={false} onPress={() => {}} />
                    <Pressable
                      onPress={() => router.replace(`/review/${data.id}`)}
                      style={s.endCall}
                      hitSlop={6}
                    >
                      <Icon name="call-end" size={22} color={colors.onError} />
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

function ControlButton({
  icon,
  active,
  onPress,
}: {
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.control, !active && s.controlOff]} hitSlop={6}>
      <Icon name={icon} size={21} color={active ? colors.inverseOnSurface : colors.onSurfaceVariant} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.inverseSurface },
  appbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 50 },
  rec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.error,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.onError },

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 5 },

  scroll: { paddingBottom: 16, gap: 14 },

  stage: {
    marginHorizontal: 16,
    height: 220,
    borderRadius: radius.xl,
    backgroundColor: "#1b2236",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  remoteTile: { alignItems: "center", gap: 8 },
  tileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tertiaryFixedDim,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selfTile: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 76,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: "#2b3350",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#3a4467",
  },
  selfLabel: { flexDirection: "row", alignItems: "center", gap: 3 },
  reactionFloat: { position: "absolute", top: 16, alignSelf: "center" },

  board: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    gap: 11,
  },
  boardHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  boardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vocab: { gap: 7 },
  vocabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vocabRowOn: { backgroundColor: colors.primaryFixed },
  guide: { gap: 2, backgroundColor: colors.tertiaryFixed, borderRadius: radius.md, padding: 11 },

  reactions: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 },
  reactionBtn: {
    width: 44,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  raise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    marginLeft: "auto",
  },
  raiseOn: { backgroundColor: colors.secondaryContainer },

  notes: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 14,
    gap: 11,
  },
  notesHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start" },

  bottom: { borderTopWidth: 1, borderTopColor: "#3a4467", gap: 10, paddingTop: 10 },
  composer: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16 },
  composerInput: {
    flex: 1,
    backgroundColor: "#2b3350",
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.inverseOnSurface,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 6,
  },
  control: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#2b3350",
    alignItems: "center",
    justifyContent: "center",
  },
  controlOff: { backgroundColor: colors.surfaceContainerHighest },
  endCall: {
    width: 58,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
});
