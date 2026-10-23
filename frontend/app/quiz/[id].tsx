import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

const SPEEDS = ["0.75x", "1.0x", "1.25x"];

export default function ToneDrill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const query = useQuery((o) => api.getQuiz(id, o), [id]);

  const [index, setIndex] = useState<number | null>(null);
  const [hearts, setHearts] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [speed, setSpeed] = useState("1.0x");
  const [done, setDone] = useState(false);

  const quiz = query.data;

  // Seed progress from the server once, then track it locally.
  useEffect(() => {
    if (quiz && index === null) {
      setIndex(quiz.startIndex);
      setHearts(quiz.hearts);
      setXp(quiz.startingXp);
    }
  }, [quiz, index]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={query}>
        {(data) => {
          if (index === null || hearts === null || xp === null) return null;

          const q = data.questions[index];
          const correct = picked === q.correct;
          const last = index === data.questions.length - 1;

          const check = () => {
            setChecked(true);
            if (picked === q.correct) setXp(xp + q.xp);
            else setHearts(Math.max(0, hearts - 1));
          };

          const advance = async () => {
            if (last) {
              await api.submitQuizResult({ quizId: data.id, xp, hearts });
              setDone(true);
              return;
            }
            setIndex(index + 1);
            setPicked(null);
            setChecked(false);
          };

          if (done) {
            const perfect = hearts === data.hearts;
            return (
              <View style={s.center}>
                <View style={s.successIcon}>
                  <Txt variant="display" style={{ fontSize: 40 }}>
                    {perfect ? "🏆" : "🎧"}
                  </Txt>
                </View>
                <Txt variant="title" style={{ textAlign: "center" }}>
                  {t("quiz", "doneTitle")}
                </Txt>
                <Txt variant="body" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
                  {perfect ? t("quiz", "donePerfect") : t("quiz", "doneBody")}
                </Txt>
                <View style={s.resultRow}>
                  <View style={s.resultStat}>
                    <Icon name="bolt" size={19} color={colors.secondary} />
                    <Txt variant="heading">+{xp - data.startingXp} XP</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {t("quiz", "xpGained")}
                    </Txt>
                  </View>
                  <View style={s.resultStat}>
                    <Icon name="favorite" size={19} color={colors.error} />
                    <Txt variant="heading">
                      {hearts} / {data.hearts}
                    </Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {t("quiz", "heartsLeft")}
                    </Txt>
                  </View>
                </View>
                <View style={{ gap: 10, alignSelf: "stretch", marginTop: 10 }}>
                  <Button
                    full
                    label={t("quiz", "backToLessons")}
                    icon="calendar-month"
                    onPress={() => router.replace("/lessons")}
                  />
                  <Button
                    full
                    variant="text"
                    label={t("quiz", "again")}
                    onPress={() => {
                      setIndex(0);
                      setHearts(data.hearts);
                      setXp(data.startingXp);
                      setPicked(null);
                      setChecked(false);
                      setDone(false);
                    }}
                  />
                </View>
              </View>
            );
          }

          return (
            <>
              <View style={s.appbar}>
                <Pressable hitSlop={8} onPress={() => router.back()}>
                  <Icon name="close" size={22} />
                </Pressable>
                <View style={s.hearts}>
                  <Icon name="favorite" size={17} color={colors.error} />
                  <Txt variant="subheading" color={colors.error}>
                    {hearts}
                  </Txt>
                </View>
                <View style={s.xpPill}>
                  <Icon name="bolt" size={14} color={colors.onSecondaryFixed} />
                  <Txt variant="micro" color={colors.onSecondaryFixed}>
                    {xp} XP
                  </Txt>
                </View>
              </View>

              <View style={s.progressWrap}>
                <View style={s.progressHead}>
                  <Txt variant="micro" color={colors.onSurfaceVariant}>
                    {data.title}
                  </Txt>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {t("quiz", "question")} {index + 1} {t("quiz", "of")} {data.questions.length}
                  </Txt>
                </View>
                <View style={s.track}>
                  <View
                    style={[s.fill, { width: `${((index + 1) / data.questions.length) * 100}%` }]}
                  />
                </View>
              </View>

              <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 6 }}>
                  <Txt variant="title">{q.prompt}</Txt>
                  <Txt
                    variant="caption"
                    color={colors.onSurfaceVariant}
                    style={{ fontWeight: "400", lineHeight: 19 }}
                  >
                    {q.instruction}
                  </Txt>
                </View>

                <Card style={s.speaker}>
                  <Avatar name={q.speaker.name} size={42} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt variant="caption" style={{ fontWeight: "600" }}>
                      {q.speaker.name}
                    </Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {q.speaker.credential}
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                    style={s.speed}
                  >
                    <Icon name="speed" size={14} color={colors.primary} />
                    <Txt variant="micro" color={colors.primary}>
                      {speed}
                    </Txt>
                  </Pressable>
                </Card>

                <View style={s.toneLegend}>
                  <Chip label={q.toneHint.high} tone="primary" icon="arrow-upward" />
                  <Chip label={q.toneHint.low} tone="neutral" icon="arrow-downward" />
                </View>

                <Pressable style={s.player}>
                  <View style={s.playerIcon}>
                    <Icon name="volume-up" size={26} color={colors.onPrimary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="subheading" color={colors.onPrimary}>
                      {t("quiz", "listen")}
                    </Txt>
                    <Txt variant="micro" color={colors.primaryFixed} style={{ fontWeight: "400" }}>
                      {t("quiz", "listenHint")}
                    </Txt>
                  </View>
                  <Txt variant="micro" color={colors.primaryFixedDim}>
                    {q.clipLength}
                  </Txt>
                </Pressable>

                <View style={{ gap: 9 }}>
                  <Txt variant="subheading">{t("quiz", "pick")}</Txt>
                  {q.options.map((o) => {
                    const isPicked = picked === o.key;
                    const isAnswer = o.key === q.correct;
                    const showRight = checked && isAnswer;
                    const showWrong = checked && isPicked && !isAnswer;

                    return (
                      <Pressable
                        key={o.key}
                        disabled={checked}
                        onPress={() => setPicked(o.key)}
                        style={({ pressed }) => [
                          s.option,
                          isPicked && !checked && s.optionPicked,
                          showRight && s.optionRight,
                          showWrong && s.optionWrong,
                          pressed && !checked && { opacity: 0.85 },
                        ]}
                      >
                        <View
                          style={[
                            s.optionKey,
                            isPicked && !checked && s.optionKeyPicked,
                            showRight && s.optionKeyRight,
                            showWrong && s.optionKeyWrong,
                          ]}
                        >
                          <Txt
                            variant="micro"
                            color={isPicked || showRight ? colors.onPrimary : colors.onSurfaceVariant}
                          >
                            {o.key}
                          </Txt>
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={s.optionTop}>
                            <Txt variant="subheading">{o.word}</Txt>
                            <Chip label={o.tone} tone="neutral" />
                          </View>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {o.meaning}
                          </Txt>
                        </View>

                        {showRight ? (
                          <Icon name="check-circle" size={20} color={colors.tertiary} />
                        ) : showWrong ? (
                          <Icon name="cancel" size={20} color={colors.error} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {checked ? (
                  <Card style={s.fact}>
                    <View style={s.factTop}>
                      <Icon name="lightbulb" size={17} color={colors.onSecondaryFixed} />
                      <Txt variant="subheading" color={colors.onSecondaryFixed} style={{ flex: 1 }}>
                        {q.fact.title}
                      </Txt>
                    </View>
                    <Txt
                      variant="caption"
                      color={colors.onSecondaryFixedVariant}
                      style={{ fontWeight: "400", lineHeight: 19 }}
                    >
                      {q.fact.body}
                    </Txt>
                  </Card>
                ) : null}
              </ScrollView>

              <SafeAreaView edges={["bottom"]} style={s.footer}>
                {checked ? (
                  <View style={[s.verdict, correct ? s.verdictRight : s.verdictWrong]}>
                    <Icon
                      name={correct ? "verified" : "error-outline"}
                      size={20}
                      color={correct ? colors.onTertiaryFixed : colors.onErrorContainer}
                    />
                    <View style={{ flex: 1 }}>
                      <Txt
                        variant="subheading"
                        color={correct ? colors.onTertiaryFixed : colors.onErrorContainer}
                      >
                        {correct ? q.successLabel : t("quiz", "wrong")}
                      </Txt>
                      <Txt
                        variant="micro"
                        color={correct ? colors.onTertiaryFixedVariant : colors.onErrorContainer}
                        style={{ fontWeight: "400" }}
                      >
                        {correct
                          ? q.successHint
                          : `${t("quiz", "wrongHint")} ${q.correct} — ${q.options.find((o) => o.key === q.correct)!.word}`}
                      </Txt>
                    </View>
                    {correct ? (
                      <View style={s.xpBadge}>
                        <Txt variant="micro" color={colors.onSecondaryFixed}>
                          +{q.xp} XP
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={s.footerInner}>
                  {checked ? (
                    <Button
                      full
                      label={
                        last
                          ? t("quiz", "finish")
                          : `${t("quiz", "nextQuestion")} ${index + 2}`
                      }
                      icon="arrow-forward"
                      onPress={advance}
                    />
                  ) : (
                    <Button full label={t("quiz", "check")} disabled={!picked} onPress={check} />
                  )}
                </View>
              </SafeAreaView>
            </>
          );
        }}
      </Loader>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  appbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 50 },
  hearts: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  progressWrap: { paddingHorizontal: 16, paddingBottom: 12, gap: 5 },
  progressHead: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },

  scroll: { padding: 16, paddingTop: 4, paddingBottom: 190, gap: 16 },

  speaker: { flexDirection: "row", alignItems: "center", gap: 11 },
  speed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toneLegend: { flexDirection: "row", gap: 7 },

  player: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 16,
  },
  playerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  optionPicked: { borderColor: colors.primary, backgroundColor: colors.primaryFixed, borderWidth: 2 },
  optionRight: { borderColor: colors.tertiary, backgroundColor: colors.tertiaryFixed, borderWidth: 2 },
  optionWrong: { borderColor: colors.error, backgroundColor: colors.errorContainer, borderWidth: 2 },
  optionKey: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  optionKeyPicked: { backgroundColor: colors.primary },
  optionKeyRight: { backgroundColor: colors.tertiary },
  optionKeyWrong: { backgroundColor: colors.error },
  optionTop: { flexDirection: "row", alignItems: "center", gap: 8 },

  fact: { gap: 8, backgroundColor: colors.secondaryFixed, borderColor: colors.secondaryFixedDim },
  factTop: { flexDirection: "row", alignItems: "center", gap: 8 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerInner: { paddingHorizontal: 16, paddingTop: 12 },
  verdict: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 12,
  },
  verdictRight: { backgroundColor: colors.tertiaryFixed },
  verdictWrong: { backgroundColor: colors.errorContainer },
  xpBadge: {
    backgroundColor: colors.secondaryFixedDim,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, padding: 24 },
  successIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.secondaryFixed,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  resultRow: { flexDirection: "row", gap: 12, alignSelf: "stretch", marginTop: 6 },
  resultStat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
});
