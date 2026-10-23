import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, Rating, SectionHeader, Txt, type IconName } from "@/components/ui";
import { Loader } from "@/components/Screen";
import TeacherHeader from "@/components/TeacherHeader";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function TeacherMe() {
  const router = useRouter();
  const { t } = useI18n();

  const profile = useQuery((o) => api.getTeacherProfile(o));
  const application = useQuery((o) => api.getApplication(o));

  const settings: { icon: IconName; label: string; hint?: string }[] = [
    {
      icon: "storefront",
      label: t("teacherProfile", "settingVisibility"),
      hint: t("teacherProfile", "settingVisibilityHint"),
    },
    {
      icon: "payments",
      label: t("teacherProfile", "settingRates"),
      hint: t("teacherProfile", "settingRatesHint"),
    },
    {
      icon: "schedule",
      label: t("profile", "settingTimezone"),
      hint: t("profile", "settingTimezoneHint"),
    },
    {
      icon: "gavel",
      label: t("teacherProfile", "settingCharter"),
      hint: t("teacherProfile", "settingCharterHint"),
    },
    { icon: "flag", label: t("teacherProfile", "settingReports") },
    { icon: "help-outline", label: t("teacherProfile", "settingSupport") },
  ];

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <TeacherHeader title={t("teacherProfile", "header")} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Loader query={profile}>
          {(me) => (
            <>
              <Card style={s.header}>
                <Avatar name={me.name} size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={s.nameRow}>
                    <Txt variant="heading" numberOfLines={1}>
                      {me.name}
                    </Txt>
                    <Icon name="verified" size={17} color={colors.primary} />
                  </View>
                  <Rating value={me.rating} count={me.reviews} />
                  <Chip label={me.badge} tone="tertiary" icon="verified" />
                </View>
              </Card>

              <View style={s.stats}>
                {[
                  {
                    icon: "hourglass-top" as IconName,
                    value: `${me.hoursThisMonth}h`,
                    label: t("teacherProfile", "thisMonth"),
                  },
                  {
                    icon: "group" as IconName,
                    value: `${me.learners}`,
                    label: t("teacherProfile", "learners"),
                  },
                  {
                    icon: "star" as IconName,
                    value: `${me.rating}`,
                    label: t("teacherProfile", "avgRating"),
                  },
                ].map((st) => (
                  <View key={st.label} style={s.stat}>
                    <Icon name={st.icon} size={19} color={colors.primary} />
                    <Txt variant="heading">{st.value}</Txt>
                    <Txt
                      variant="micro"
                      color={colors.onSurfaceVariant}
                      style={{ fontWeight: "400", textAlign: "center" }}
                    >
                      {st.label}
                    </Txt>
                  </View>
                ))}
              </View>
            </>
          )}
        </Loader>

        <Loader query={application}>
          {(app) => (
            <>
              <View>
                <SectionHeader
                  title={t("teacherProfile", "languagesTitle")}
                  trailing={t("teacherProfile", "searchVisibility")}
                />
                <View style={{ gap: 8 }}>
                  {app.languages.map((l) => (
                    <View key={l.name} style={s.langRow}>
                      <Icon name="record-voice-over" size={18} color={colors.primary} />
                      <Txt variant="body" style={{ flex: 1 }}>
                        {l.name}
                      </Txt>
                      <Chip label={l.level} tone="tertiary" />
                    </View>
                  ))}
                </View>
              </View>

              <View>
                <SectionHeader
                  title={t("teacherProfile", "verificationTitle")}
                  trailing={t("teacherProfile", "badgeActive")}
                />
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {app.docs.map((d, i) => (
                    <View key={d.id} style={[s.docRow, i < app.docs.length - 1 && s.divider]}>
                      <Icon name={d.icon} size={19} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="caption" style={{ fontWeight: "600" }}>
                          {d.title}
                        </Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {d.hint}
                        </Txt>
                      </View>
                      {d.verified ? <Icon name="verified" size={17} color={colors.tertiary} /> : null}
                    </View>
                  ))}
                </Card>
                <Button
                  variant="text"
                  label={t("teacherProfile", "reviewApplication")}
                  icon="assignment"
                  onPress={() => router.push("/apply")}
                />
              </View>
            </>
          )}
        </Loader>

        <View>
          <SectionHeader title={t("profile", "settings")} />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {settings.map((item, i) => (
              <View key={item.label} style={[s.settingRow, i < settings.length - 1 && s.divider]}>
                <Icon name={item.icon} size={19} color={colors.onSurfaceVariant} />
                <View style={{ flex: 1 }}>
                  <Txt variant="body">{item.label}</Txt>
                  {item.hint ? (
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {item.hint}
                    </Txt>
                  ) : null}
                </View>
                <Icon name="chevron-right" size={19} color={colors.outline} />
              </View>
            ))}
          </Card>
        </View>

        <Button
          variant="outlined"
          full
          label={t("teacherProfile", "switchToLearner")}
          icon="swap-horiz"
          onPress={() => router.replace("/discover")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 16, paddingBottom: 32, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stats: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
});
