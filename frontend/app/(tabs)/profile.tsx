import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, SectionHeader, Txt, type IconName } from "@/components/ui";
import { Loader, LocaleToggle } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function Profile() {
  const router = useRouter();
  const { t, isDeviceDefault } = useI18n();
  const query = useQuery((o) => api.getStudent(o));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Txt variant="title">{t("profile", "title")}</Txt>
        <Icon name="settings" size={22} color={colors.onSurfaceVariant} />
      </View>

      <Loader query={query}>
        {(student) => {
          const settings: {
            icon: IconName;
            label: string;
            hint?: string;
            onPress?: () => void;
          }[] = [
            {
              icon: "translate",
              label: t("profile", "settingLanguages"),
              hint: student.languages.join(", "),
            },
            {
              icon: "notifications",
              label: t("profile", "settingNotifications"),
              hint: t("profile", "settingNotificationsHint"),
            },
            {
              icon: "schedule",
              label: t("profile", "settingTimezone"),
              hint: t("profile", "settingTimezoneHint"),
            },
            {
              icon: "shield",
              label: t("profile", "settingSafety"),
              onPress: () => router.push("/report/NK-8429"),
            },
            { icon: "help-outline", label: t("profile", "settingHelp") },
          ];

          return (
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
              <Card style={s.header}>
                <Avatar name={student.name} size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt variant="title">{student.name}</Txt>
                  <View style={s.headerChips}>
                    <Chip label={`${t("profile", "level")} ${student.level}`} tone="primary" />
                    <Chip
                      label={`${student.passCredits} ${t("profile", "credits")}`}
                      tone="secondary"
                      icon="bolt"
                    />
                  </View>
                </View>
              </Card>

              <View style={s.stats}>
                {[
                  {
                    icon: "local-fire-department" as IconName,
                    value: `${student.streak}`,
                    label: t("profile", "streakDays"),
                  },
                  {
                    icon: "timer" as IconName,
                    value: `${student.minutesLearned}`,
                    label: t("profile", "minutesLearned"),
                  },
                  {
                    icon: "school" as IconName,
                    value: `${student.lessonsTaken}`,
                    label: t("profile", "lessonsTaken"),
                  },
                ].map((st) => (
                  <View key={st.label} style={s.stat}>
                    <Icon name={st.icon} size={20} color={colors.primary} />
                    <Txt variant="title">{st.value}</Txt>
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

              <Card style={s.localeCard}>
                <Icon name="language" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Txt variant="body">{t("profile", "appLanguage")}</Txt>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {isDeviceDefault
                      ? t("profile", "appLanguageDevice")
                      : t("profile", "appLanguageChosen")}
                  </Txt>
                </View>
                <LocaleToggle />
              </Card>

              {/* Per _ARCHITECTURE_PLAN.md §3 the mobile app never shows prices or
                  checkout — billing is handled on the web to avoid store IAP fees. */}
              <Card style={s.billing}>
                <View style={s.billingRow}>
                  <Icon name="account-balance-wallet" size={20} color={colors.tertiary} />
                  <Txt variant="subheading">{t("profile", "billingTitle")}</Txt>
                </View>
                <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                  {t("profile", "billingBody")}
                </Txt>
                <Button variant="outlined" label={t("profile", "openWeb")} icon="open-in-new" />
              </Card>

              <View>
                <SectionHeader title={t("profile", "settings")} />
                <Card style={{ padding: 0, overflow: "hidden" }}>
                  {settings.map((item, i) => (
                    <Pressable
                      key={item.label}
                      onPress={item.onPress}
                      style={[s.settingRow, i < settings.length - 1 && s.settingDivider]}
                    >
                      <Icon name={item.icon} size={20} color={colors.onSurfaceVariant} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="body">{item.label}</Txt>
                        {item.hint ? (
                          <Txt
                            variant="micro"
                            color={colors.onSurfaceVariant}
                            style={{ fontWeight: "400" }}
                          >
                            {item.hint}
                          </Txt>
                        ) : null}
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.outline} />
                    </Pressable>
                  ))}
                </Card>
              </View>

              <Button
                variant="text"
                full
                label={t("profile", "becomeTeacher")}
                icon="school"
                onPress={() => router.push("/apply")}
              />
            </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 52,
  },
  scroll: { padding: 16, paddingBottom: 32, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
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
  localeCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  billing: { gap: 10 },
  billingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
});
