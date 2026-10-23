import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, ProgressBar, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function Lessons() {
  const router = useRouter();
  const { t } = useI18n();

  const lessons = useQuery((o) => api.listUpcomingLessons(o));
  const courses = useQuery((o) => api.listCourses(o));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Txt variant="title">{t("lessons", "title")}</Txt>
        <Chip label={t("common", "timezone")} icon="schedule" tone="neutral" />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Loader query={lessons}>
            {(list) => (
              <>
                <SectionHeader
                  title={t("lessons", "upcoming")}
                  trailing={`${list.length} ${t("lessons", "upcomingCount")}`}
                />
                <View style={{ gap: 12 }}>
                  {list.map((l, i) => (
                    <Card key={l.id} style={s.lesson}>
                      <Pressable
                        style={s.lessonTop}
                        onPress={() => router.push(`/lesson/${l.id}`)}
                      >
                        <Avatar name={l.teacher} uri={l.avatar} size={44} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt variant="subheading" numberOfLines={1}>
                            {l.topic}
                          </Txt>
                          <Txt variant="caption" color={colors.onSurfaceVariant}>
                            {l.teacher} · {l.duration} min
                          </Txt>
                        </View>
                        {i === 0 ? (
                          <Chip label={t("lessons", "soon")} tone="secondary" icon="bolt" />
                        ) : (
                          <Icon name="chevron-right" size={20} color={colors.outline} />
                        )}
                      </Pressable>

                      <View style={s.when}>
                        <Icon name="event" size={16} color={colors.primary} />
                        <Txt variant="caption" style={{ fontWeight: "700" }}>
                          {l.date} · {l.time}
                        </Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          ({l.tz})
                        </Txt>
                      </View>

                      <View style={s.lessonActions}>
                        <Button
                          variant="outlined"
                          label={t("common", "message")}
                          icon="chat-bubble-outline"
                          style={{ flex: 1 }}
                          onPress={() => router.push("/messages")}
                        />
                        <Button
                          label={i === 0 ? t("lessons", "join") : t("lessons", "details")}
                          icon={i === 0 ? "videocam" : "info-outline"}
                          style={{ flex: 1 }}
                          onPress={() =>
                            router.push(i === 0 ? `/classroom/${l.id}` : `/lesson/${l.id}`)
                          }
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              </>
            )}
          </Loader>
        </View>

        <View>
          <SectionHeader title={t("lessons", "coursesTitle")} trailing={t("lessons", "progress")} />
          <Loader query={courses}>
            {(list) => (
              <View style={{ gap: 12 }}>
                {list.map((c) => {
                  const pct = c.completed / c.lessons;
                  const done = c.completed === c.lessons;
                  return (
                    <Card key={c.id} style={{ gap: 10 }}>
                      <View style={s.courseTop}>
                        <View style={s.courseIcon}>
                          <Icon
                            name={done ? "workspace-premium" : "play-circle-outline"}
                            size={22}
                            color={colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt variant="subheading" numberOfLines={1}>
                            {c.title}
                          </Txt>
                          <Txt variant="caption" color={colors.onSurfaceVariant}>
                            {c.teacher} · {c.level} · ~{c.minutes} {t("lessons", "perLesson")}
                          </Txt>
                        </View>
                        {done ? (
                          <Chip label={t("lessons", "done")} tone="tertiary" icon="check" />
                        ) : null}
                      </View>

                      <ProgressBar value={pct} />
                      <View style={s.courseMeta}>
                        <Txt variant="micro" color={colors.onSurfaceVariant}>
                          {c.completed} / {c.lessons} {t("lessons", "lessonsLabel")}
                        </Txt>
                        <Txt variant="micro" color={colors.primary}>
                          {Math.round(pct * 100)}%
                        </Txt>
                      </View>

                      <Button
                        variant="tonal"
                        label={t("lessons", "practice")}
                        icon="headphones"
                        onPress={() => router.push(`/quiz/${c.id}`)}
                      />
                    </Card>
                  );
                })}
              </View>
            )}
          </Loader>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 52,
  },
  scroll: { padding: 16, paddingBottom: 32, gap: 28 },
  lesson: { gap: 12 },
  lessonTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  when: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lessonActions: { flexDirection: "row", gap: 8 },
  courseTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  courseIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  courseMeta: { flexDirection: "row", justifyContent: "space-between" },
});
