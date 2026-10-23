import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icon,
  SectionHeader,
  Txt,
  type IconName,
} from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useMutation, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

/* The lesson record behind a row in Lessons -> upcoming.
 *
 * A stack route rather than a tab: it is reached from a card, has a pinned
 * action footer, and should not keep the tab bar under that footer. */
export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const query = useQuery((o) => api.getLesson(id, o), [id]);
  const reschedule = useMutation(api.requestReschedule);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={query}>
        {(lesson) => {
          if (!lesson) {
            return (
              <View style={s.missing}>
                <Icon name="event-busy" size={28} color={colors.onSurfaceVariant} />
                <Txt variant="caption" color={colors.onSurfaceVariant}>
                  {t("lessonDetail", "notFound")}
                </Txt>
              </View>
            );
          }

          const facts: { icon: IconName; label: string; value: string }[] = [
            {
              icon: "event",
              label: t("lessonDetail", "when"),
              value: `${lesson.date} · ${lesson.time}–${lesson.endTime}`,
            },
            {
              icon: "schedule",
              label: t("lessonDetail", "duration"),
              value: `${lesson.duration} ${t("lessonDetail", "minutes")}`,
            },
            { icon: "person", label: t("lessonDetail", "format"), value: lesson.lessonType },
            { icon: "trending-up", label: t("lessonDetail", "level"), value: lesson.level },
          ];

          return (
            <>
              <View style={s.appbar}>
                <Pressable hitSlop={8} onPress={() => router.back()}>
                  <Icon name="arrow-back" size={22} />
                </Pressable>
                <Txt variant="subheading" numberOfLines={1} style={{ flex: 1 }}>
                  {t("lessonDetail", "title")}
                </Txt>
                <Chip
                  label={lesson.statusLabel}
                  tone={lesson.status === "confirmed" ? "tertiary" : "neutral"}
                  icon={lesson.status === "confirmed" ? "check-circle" : "hourglass-empty"}
                />
              </View>

              <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {lesson.cover ? (
                  <View style={s.coverWrap}>
                    <Image source={{ uri: lesson.cover }} style={s.cover} resizeMode="cover" />
                    <View style={s.coverBadge}>
                      <Icon name="bolt" size={13} color={colors.onSecondaryFixed} />
                      <Txt variant="micro" color={colors.onSecondaryFixed}>
                        {lesson.countdown}
                      </Txt>
                    </View>
                  </View>
                ) : null}

                <View style={{ gap: 6 }}>
                  <Txt variant="display" color={colors.onSurface}>
                    {lesson.topic}
                  </Txt>
                  <Txt
                    variant="caption"
                    color={colors.onSurfaceVariant}
                    style={{ fontWeight: "400" }}
                  >
                    {lesson.language} · {lesson.tz}
                  </Txt>
                </View>

                <Pressable onPress={() => router.push(`/teacher/${lesson.teacherId}`)}>
                  <Card style={s.teacherCard}>
                    <Avatar name={lesson.teacher} uri={lesson.avatar} size={52} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="subheading" numberOfLines={1}>
                        {lesson.teacher}
                      </Txt>
                      <Txt
                        variant="micro"
                        color={colors.onSurfaceVariant}
                        numberOfLines={2}
                        style={{ fontWeight: "400" }}
                      >
                        {lesson.teacherHeadline}
                      </Txt>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.outline} />
                  </Card>
                </Pressable>

                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {facts.map((f, i) => (
                    <View key={f.label} style={[s.factRow, i < facts.length - 1 && s.divider]}>
                      <Icon name={f.icon} size={18} color={colors.primary} />
                      <Txt
                        variant="caption"
                        color={colors.onSurfaceVariant}
                        style={{ flex: 1, fontWeight: "400" }}
                      >
                        {f.label}
                      </Txt>
                      <Txt variant="caption" style={{ fontWeight: "700" }}>
                        {f.value}
                      </Txt>
                    </View>
                  ))}
                </Card>

                <View>
                  <SectionHeader title={t("lessonDetail", "objectives")} />
                  <Card style={{ gap: 10 }}>
                    {lesson.objectives.map((o) => (
                      <View key={o} style={s.objective}>
                        <Icon name="check-circle" size={17} color={colors.tertiary} />
                        <Txt variant="caption" style={{ flex: 1, fontWeight: "400" }}>
                          {o}
                        </Txt>
                      </View>
                    ))}
                  </Card>
                </View>

                <View>
                  <SectionHeader title={t("lessonDetail", "materials")} />
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    {lesson.materials.map((m, i) => (
                      <Pressable
                        key={m.id}
                        style={[s.material, i < lesson.materials.length - 1 && s.divider]}
                      >
                        <View style={s.materialIcon}>
                          <Icon name={m.icon} size={19} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt variant="body" numberOfLines={1}>
                            {m.label}
                          </Txt>
                          <Txt
                            variant="micro"
                            color={colors.onSurfaceVariant}
                            style={{ fontWeight: "400" }}
                          >
                            {m.meta}
                          </Txt>
                        </View>
                        <Icon name="file-download" size={19} color={colors.onSurfaceVariant} />
                      </Pressable>
                    ))}
                  </Card>
                </View>

                <Card style={s.note}>
                  <View style={s.noteHead}>
                    <Icon name="sticky-note-2" size={18} color={colors.tertiary} />
                    <Txt variant="subheading">{t("lessonDetail", "noteTitle")}</Txt>
                  </View>
                  <Txt
                    variant="caption"
                    color={colors.onSurfaceVariant}
                    style={{ fontWeight: "400" }}
                  >
                    {lesson.teacherNote}
                  </Txt>
                </Card>

                <Card style={s.note}>
                  <View style={s.noteHead}>
                    <Icon name="policy" size={18} color={colors.onSurfaceVariant} />
                    <Txt variant="subheading">{t("lessonDetail", "policyTitle")}</Txt>
                  </View>
                  <Txt
                    variant="caption"
                    color={colors.onSurfaceVariant}
                    style={{ fontWeight: "400" }}
                  >
                    {lesson.policy}
                  </Txt>
                </Card>

                <Button
                  variant="text"
                  full
                  icon="event-repeat"
                  label={
                    reschedule.pending
                      ? t("lessonDetail", "rescheduling")
                      : t("lessonDetail", "reschedule")
                  }
                  onPress={async () => {
                    const res = await reschedule.run({ lessonId: lesson.id });
                    if (res) setNotice(res.message);
                  }}
                />
                {notice ? (
                  <View style={s.notice}>
                    <Icon name="check-circle" size={16} color={colors.tertiary} />
                    <Txt
                      variant="micro"
                      color={colors.onSurfaceVariant}
                      style={{ flex: 1, fontWeight: "400" }}
                    >
                      {notice}
                    </Txt>
                  </View>
                ) : null}
              </ScrollView>

              <SafeAreaView edges={["bottom"]} style={s.footer}>
                <View style={s.footerInner}>
                  <Button
                    variant="outlined"
                    icon="chat-bubble-outline"
                    label={t("lessonDetail", "message")}
                    style={{ flex: 1 }}
                    onPress={() => router.push("/messages")}
                  />
                  <Button
                    icon={lesson.joinable ? "videocam" : "lock-clock"}
                    label={lesson.joinable ? t("lessonDetail", "join") : t("lessonDetail", "notYet")}
                    style={{ flex: 1 }}
                    disabled={!lesson.joinable}
                    onPress={() => router.push(`/classroom/${lesson.id}`)}
                  />
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
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  // Bottom padding clears the pinned footer.
  scroll: { padding: 16, paddingBottom: 116, gap: 20 },
  coverWrap: { borderRadius: radius.lg, overflow: "hidden" },
  cover: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surfaceContainerHigh },
  coverBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  teacherCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  factRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  objective: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  material: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  materialIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { gap: 8 },
  noteHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerInner: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
});
