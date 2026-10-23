import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import TeacherHeader from "@/components/TeacherHeader";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { IconName } from "@/components/ui";
import type { SlotState } from "@/lib/api/types";

const stateStyle: Record<SlotState, { bg: string; border: string; icon: IconName; tint: string }> = {
  done: { bg: colors.surfaceContainerLow, border: colors.outlineVariant, icon: "check-circle", tint: colors.tertiary },
  next: { bg: colors.primaryFixed, border: colors.primary, icon: "sensors", tint: colors.primary },
  open: { bg: colors.surfaceContainerLowest, border: colors.secondaryContainer, icon: "lock-open", tint: colors.secondary },
  blocked: { bg: colors.surfaceContainer, border: colors.outlineVariant, icon: "bedtime", tint: colors.onSurfaceVariant },
};

export default function TeacherSchedule() {
  const router = useRouter();
  const { t } = useI18n();

  const [day, setDay] = useState("18");
  const [autoAccept, setAutoAccept] = useState(true);

  const profile = useQuery((o) => api.getTeacherProfile(o));
  const next = useQuery((o) => api.getNextSession(o));
  const week = useQuery((o) => api.getWeek(o));
  const slots = useQuery((o) => api.listSlots(day, o), [day]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <TeacherHeader title={t("teacherSchedule", "header")} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Loader query={profile}>
          {(me) => (
            <>
              <View style={s.greeting}>
                <Txt variant="title">
                  {t("teacherSchedule", "greeting")}, Dr. {me.firstName} 👋
                </Txt>
                <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                  {t("teacherSchedule", "greetingLead")}
                </Txt>
                <View style={s.greetChips}>
                  <Chip label={me.badge} tone="tertiary" icon="verified" />
                  <Chip label={me.status} tone="secondary" />
                </View>
              </View>

              <View style={s.kpis}>
                {[
                  {
                    label: t("teacherSchedule", "today"),
                    icon: "event-available" as IconName,
                    value: `${me.sessionsToday} ${t("teacherSchedule", "sessions")}`,
                    hint: `${me.sessionsDone} ${t("teacherSchedule", "doneUpcoming")} • ${me.sessionsUpcoming} ${t("teacherSchedule", "upcoming")}`,
                  },
                  {
                    label: t("teacherSchedule", "volume"),
                    icon: "hourglass-top" as IconName,
                    value: `${me.hoursThisMonth}h`,
                    hint: t("teacherSchedule", "volumeHint"),
                  },
                  {
                    label: t("teacherSchedule", "quality"),
                    icon: "star" as IconName,
                    value: `${me.rating}`,
                    hint: `${me.reviews} ${t("teacherSchedule", "qualityHint")}`,
                  },
                ].map((k) => (
                  <View key={k.label} style={s.kpi}>
                    <Txt variant="micro" color={colors.onSurfaceVariant}>
                      {k.label}
                    </Txt>
                    <View style={s.kpiValue}>
                      <Icon name={k.icon} size={16} color={colors.primary} />
                      <Txt variant="heading">{k.value}</Txt>
                    </View>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {k.hint}
                    </Txt>
                  </View>
                ))}
              </View>
            </>
          )}
        </Loader>

        <Loader query={next}>
          {(n) => (
            <Card style={s.next}>
              <View style={s.nextTop}>
                <Chip
                  label={`${t("teacherSchedule", "inMinutes")} ${n.inMinutes} ${t("teacherSchedule", "minutes")} • ${n.at}`}
                  tone="secondary"
                  icon="timer"
                />
                <Txt variant="micro" color={colors.tertiary} style={{ marginLeft: "auto" }}>
                  {n.latency}
                </Txt>
              </View>
              <View style={s.nextStudent}>
                <Avatar name={n.student} size={46} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.nextNameRow}>
                    <Txt variant="subheading">{n.student}</Txt>
                    <Chip label={n.level} tone="primary" />
                  </View>
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {n.topic}
                  </Txt>
                </View>
              </View>
              <View style={s.nextProgress}>
                <Icon name="history-edu" size={15} color={colors.onSurfaceVariant} />
                <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                  {n.progress}
                </Txt>
              </View>
              <Button
                full
                label={t("teacherSchedule", "openRoom")}
                icon="videocam"
                onPress={() => router.push("/classroom/NK-8429")}
              />
              <View style={s.nextActions}>
                <Button
                  variant="outlined"
                  label={t("teacherSchedule", "fileNotes")}
                  icon="folder-shared"
                  style={{ flex: 1 }}
                  onPress={() => router.push("/roster")}
                />
                <Button
                  variant="outlined"
                  label={t("teacherSchedule", "quickMessage")}
                  icon="chat"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}
        </Loader>

        <View>
          <SectionHeader
            title={t("teacherSchedule", "planningTitle")}
            trailing={t("teacherSchedule", "planningHint")}
          />
          <Loader query={week}>
            {(days) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
                {days.map((d) => {
                  const on = day === d.date;
                  return (
                    <Pressable key={d.date} onPress={() => setDay(d.date)} style={[s.day, on && s.dayOn]}>
                      <Txt variant="micro" color={on ? colors.onPrimary : colors.onSurfaceVariant}>
                        {d.today ? t("teacherSchedule", "today") : d.day}
                      </Txt>
                      <Txt variant="heading" color={on ? colors.onPrimary : colors.onSurface}>
                        {d.date}
                      </Txt>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Loader>

          <Loader query={slots}>
            {(list) => (
              <View style={{ gap: 10, marginTop: 14, minHeight: 80 }}>
                {list.map((sl) => {
                  const st = stateStyle[sl.state];
                  return (
                    <View
                      key={sl.id}
                      style={[
                        s.slot,
                        { backgroundColor: st.bg, borderColor: st.border },
                        sl.state === "next" && { borderWidth: 2 },
                      ]}
                    >
                      <View style={s.slotTime}>
                        <Txt variant="subheading">{sl.start}</Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {sl.end}
                        </Txt>
                      </View>

                      <View style={s.slotBody}>
                        <View style={s.slotHeadRow}>
                          <Icon name={st.icon} size={16} color={st.tint} />
                          <Txt variant="subheading" numberOfLines={1} style={{ flex: 1 }}>
                            {sl.student ?? sl.title}
                          </Txt>
                          <Chip
                            label={sl.statusLabel}
                            tone={sl.state === "next" ? "primary" : "neutral"}
                          />
                        </View>

                        {sl.student ? (
                          <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {sl.studentMeta ? `${sl.studentMeta} · ` : ""}
                            {sl.title}
                          </Txt>
                        ) : null}

                        {sl.note ? (
                          <View style={s.slotNote}>
                            {sl.noteIcon ? (
                              <Icon name={sl.noteIcon} size={14} color={colors.onSurfaceVariant} />
                            ) : null}
                            <Txt
                              variant="micro"
                              color={colors.onSurfaceVariant}
                              style={{ fontWeight: "400", flex: 1 }}
                            >
                              {sl.note}
                            </Txt>
                          </View>
                        ) : null}

                        {sl.state === "open" ? (
                          <Button
                            variant="text"
                            label={t("teacherSchedule", "blockSlot")}
                            icon="block"
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Loader>
        </View>

        <View>
          <SectionHeader
            title={t("teacherSchedule", "slotsTitle")}
            trailing={t("teacherSchedule", "slotsHint")}
          />
          <Card style={{ gap: 14 }}>
            <Button variant="tonal" full label={t("teacherSchedule", "addSlots")} icon="add" />

            <Pressable style={s.toggleRow} onPress={() => setAutoAccept((v) => !v)}>
              <Icon name="auto-mode" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="body">{t("teacherSchedule", "autoAccept")}</Txt>
                <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                  {t("teacherSchedule", "autoAcceptHint")}
                </Txt>
              </View>
              <View style={[s.switch, autoAccept && s.switchOn]}>
                <View style={[s.knob, autoAccept && s.knobOn]} />
              </View>
            </Pressable>

            <View style={s.divider} />

            <Pressable style={s.toggleRow}>
              <Icon name="menu-book" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="body">{t("teacherSchedule", "docsTitle")}</Txt>
                <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                  {t("teacherSchedule", "docsHint")}
                </Txt>
              </View>
              <Icon name="arrow-forward" size={18} color={colors.outline} />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 16, paddingBottom: 32, gap: 24 },

  greeting: { gap: 6 },
  greetChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },

  kpis: { flexDirection: "row", gap: 8, marginTop: 20 },
  kpi: {
    flex: 1,
    gap: 3,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 11,
  },
  kpiValue: { flexDirection: "row", alignItems: "center", gap: 5 },

  next: { gap: 12, borderColor: colors.primary, borderWidth: 2 },
  nextTop: { flexDirection: "row", alignItems: "center" },
  nextStudent: { flexDirection: "row", alignItems: "center", gap: 12 },
  nextNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nextProgress: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextActions: { flexDirection: "row", gap: 8 },

  days: { gap: 8, paddingBottom: 4 },
  day: {
    width: 54,
    alignItems: "center",
    gap: 2,
    paddingVertical: 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  slot: { flexDirection: "row", gap: 12, padding: 13, borderRadius: radius.lg, borderWidth: 1 },
  slotTime: { width: 48, alignItems: "flex-start", gap: 1 },
  slotBody: { flex: 1, gap: 5 },
  slotHeadRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  slotNote: { flexDirection: "row", alignItems: "flex-start", gap: 6 },

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
  divider: { height: 1, backgroundColor: colors.outlineVariant },
});
