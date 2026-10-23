import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function SessionReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const query = useQuery((o) => api.getSessionSummary(id, o), [id]);

  const [rating, setRating] = useState(5);
  const [picked, setPicked] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [showProfile, setShowProfile] = useState(true);
  const [sent, setSent] = useState(false);

  const toggle = (hid: string) =>
    setPicked((prev) => (prev.includes(hid) ? prev.filter((x) => x !== hid) : [...prev, hid]));

  const ratings = t("review", "ratings") as readonly string[];

  if (sent) {
    return (
      <SafeAreaView style={s.root} edges={["top", "bottom"]}>
        <View style={s.center}>
          <View style={s.successIcon}>
            <Icon name="rate-review" size={36} color={colors.onPrimary} />
          </View>
          <Txt variant="title" style={{ textAlign: "center" }}>
            {t("review", "thanksTitle")}
          </Txt>
          <Txt variant="body" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
            {t("review", "thanksBody")}
          </Txt>
          <View style={{ gap: 10, alignSelf: "stretch", marginTop: 10 }}>
            <Button
              full
              label={t("review", "bookNext")}
              icon="calendar-today"
              onPress={() =>
                router.replace(`/book/${query.data?.teacherId ?? "henriette-mbassi"}`)
              }
            />
            <Button
              full
              variant="text"
              label={t("review", "home")}
              onPress={() => router.replace("/discover")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Pressable hitSlop={8} onPress={() => router.replace("/discover")}>
          <Icon name="close" size={22} />
        </Pressable>
        <Txt variant="heading">{t("review", "title")}</Txt>
      </View>

      <Loader query={query}>
        {(session) => (
          <>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
              <Card style={s.hero}>
                <Txt variant="display" style={{ fontSize: 34 }}>
                  🎓
                </Txt>
                <Txt variant="title" color={colors.onPrimary} style={{ textAlign: "center" }}>
                  {t("review", "doneTitle")}
                </Txt>
                <Txt
                  variant="caption"
                  color={colors.primaryFixed}
                  style={{ textAlign: "center", fontWeight: "400" }}
                >
                  {session.duration} min • {session.subject}
                </Txt>
                <View style={s.heroWhen}>
                  <Icon name="schedule" size={14} color={colors.primaryFixedDim} />
                  <Txt variant="micro" color={colors.primaryFixedDim} style={{ fontWeight: "400" }}>
                    {session.when}
                  </Txt>
                </View>
              </Card>

              <Card style={s.tutor}>
                <Avatar name={session.teacher} size={50} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.tutorNameRow}>
                    <Txt variant="subheading" numberOfLines={1}>
                      {session.teacher}
                    </Txt>
                    <Icon name="verified" size={15} color={colors.primary} />
                  </View>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {session.credential}
                  </Txt>
                </View>
              </Card>

              <View style={s.block}>
                <Txt variant="heading" style={{ textAlign: "center" }}>
                  {t("review", "question")}
                </Txt>
                <View style={s.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                      <Icon
                        name={n <= rating ? "star" : "star-border"}
                        size={38}
                        color={n <= rating ? colors.secondaryContainer : colors.outlineVariant}
                      />
                    </Pressable>
                  ))}
                </View>
                <Txt variant="subheading" color={colors.secondary} style={{ textAlign: "center" }}>
                  {ratings[rating]}
                </Txt>
              </View>

              <View style={s.block}>
                <Txt variant="subheading">{t("review", "highlights")}</Txt>
                <View style={s.highlights}>
                  {session.highlights.map((h) => (
                    <Chip
                      key={h.id}
                      label={h.label}
                      selected={picked.includes(h.id)}
                      onPress={() => toggle(h.id)}
                    />
                  ))}
                </View>
              </View>

              <View style={s.block}>
                <Txt variant="subheading">{t("review", "comment")}</Txt>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  style={s.comment}
                  placeholder={t("review", "commentPlaceholder")}
                  placeholderTextColor={colors.onSurfaceVariant}
                />
                <Pressable style={s.toggleRow} onPress={() => setShowProfile((v) => !v)}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="caption">{t("review", "showProfile")}</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {t("review", "showProfileHint")}
                    </Txt>
                  </View>
                  <View style={[s.switch, showProfile && s.switchOn]}>
                    <View style={[s.knob, showProfile && s.knobOn]} />
                  </View>
                </Pressable>
              </View>

              <Card style={s.nextStep}>
                <View style={s.nextTop}>
                  <Icon name="calendar-month" size={18} color={colors.onTertiaryFixed} />
                  <Txt variant="subheading" color={colors.onTertiaryFixed} style={{ flex: 1 }}>
                    {t("review", "nextStep")}
                  </Txt>
                  <Chip
                    label={`${session.remainingSessions} ${t("review", "remaining")}`}
                    tone="tertiary"
                  />
                </View>
                <Txt
                  variant="caption"
                  color={colors.onTertiaryFixedVariant}
                  style={{ fontWeight: "400", lineHeight: 18 }}
                >
                  {t("review", "nextBody")}
                </Txt>
              </Card>

              <Button
                variant="text"
                full
                label={t("review", "reportIssue")}
                icon="flag"
                onPress={() => router.push(`/report/${session.id}`)}
              />
            </ScrollView>

            <SafeAreaView edges={["bottom"]} style={s.footer}>
              <View style={s.footerInner}>
                <Button
                  full
                  label={t("review", "submit")}
                  icon="arrow-forward"
                  disabled={rating === 0}
                  onPress={async () => {
                    await api.submitReview({
                      sessionId: session.id,
                      rating,
                      highlights: picked,
                      comment,
                      showProfile,
                    });
                    setSent(true);
                  }}
                />
                <Button
                  full
                  variant="text"
                  label={t("review", "skipHome")}
                  onPress={() => router.replace("/discover")}
                />
              </View>
            </SafeAreaView>
          </>
        )}
      </Loader>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, height: 52 },
  scroll: { padding: 16, paddingBottom: 160, gap: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  hero: { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: "center", gap: 6 },
  heroWhen: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },

  tutor: { flexDirection: "row", alignItems: "center", gap: 12 },
  tutorNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },

  block: { gap: 10 },
  stars: { flexDirection: "row", justifyContent: "center", gap: 6 },
  highlights: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  comment: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 13,
    minHeight: 96,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    padding: 3,
    justifyContent: "center",
  },
  switchOn: { backgroundColor: colors.primary },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.outline },
  knobOn: { backgroundColor: colors.onPrimary, alignSelf: "flex-end" },

  nextStep: { backgroundColor: colors.tertiaryFixed, borderColor: colors.tertiaryFixedDim, gap: 8 },
  nextTop: { flexDirection: "row", alignItems: "center", gap: 8 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerInner: { paddingHorizontal: 16, paddingTop: 10, gap: 2 },
});
