import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader, LocaleToggle } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function Onboarding() {
  const router = useRouter();
  const { t } = useI18n();
  const query = useQuery((o) => api.getOnboarding(o));

  const [lang, setLang] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [level, setLevel] = useState("A0");

  const toggleGoal = (id: string) =>
    setGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable hitSlop={8} style={s.iconBtn} accessibilityLabel={t("common", "back")}>
            <Icon name="arrow-back" size={22} />
          </Pressable>
          <Txt variant="heading">{t("onboarding", "title")}</Txt>
          <View style={s.headerRight}>
            <LocaleToggle />
            <Pressable onPress={() => router.replace("/discover")}>
              <Txt variant="subheading" color={colors.primary}>
                {t("common", "skip")}
              </Txt>
            </Pressable>
          </View>
        </View>
        <View style={s.progressRow}>
          <Txt variant="caption" color={colors.onSurfaceVariant}>
            {t("onboarding", "step")}
          </Txt>
          <Txt variant="caption" color={colors.onSurfaceVariant}>
            {t("onboarding", "stepName")}
          </Txt>
        </View>
        <View style={s.track}>
          <View style={s.fill} />
        </View>
      </View>

      <Loader query={query}>
        {(data) => (
          <>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
              <View style={s.intro}>
                <Txt variant="display">{t("onboarding", "heading")}</Txt>
                <Txt variant="body" color={colors.onSurfaceVariant} style={s.lead}>
                  {t("onboarding", "lead")}
                </Txt>

                <View style={s.streak}>
                  <Icon name="local-fire-department" size={19} color={colors.onSecondaryFixed} />
                  <Txt variant="caption" color={colors.onSecondaryFixed} style={{ fontWeight: "700" }}>
                    {t("onboarding", "streak")}
                  </Txt>
                </View>
                <Txt variant="caption" color={colors.onSurfaceVariant}>
                  {t("onboarding", "streakHint")}
                </Txt>
              </View>

              <View>
                <SectionHeader
                  title={t("onboarding", "languagesTitle")}
                  trailing={t("onboarding", "languagesCount")}
                />
                <View style={{ gap: 12 }}>
                  {data.languages.map((l) => {
                    const on = lang === l.slug;
                    return (
                      <Pressable
                        key={l.slug}
                        onPress={() => setLang(l.slug)}
                        style={({ pressed }) => [
                          s.langCard,
                          on && s.langCardOn,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={[s.langIcon, on && { backgroundColor: colors.primary }]}>
                          <Icon
                            name={l.icon}
                            size={21}
                            color={on ? colors.onPrimary : colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={s.langTitleRow}>
                            <Txt variant="subheading">{l.name}</Txt>
                            {l.popular ? (
                              <Chip label={t("onboarding", "popular")} tone="secondary" icon="star" />
                            ) : null}
                            {on ? (
                              <Icon
                                name="check-circle"
                                size={18}
                                color={colors.primary}
                                style={{ marginLeft: "auto" }}
                              />
                            ) : null}
                          </View>
                          <Txt variant="caption" color={colors.onSurfaceVariant}>
                            {l.region} · {l.tutors} {t("onboarding", "tutorsAvailable")}
                          </Txt>
                          <Txt variant="caption" color={colors.onSurfaceVariant} style={s.langBlurb}>
                            {l.blurb}
                          </Txt>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <SectionHeader
                  title={t("onboarding", "motivationsTitle")}
                  trailing={t("onboarding", "multiSelect")}
                />
                <Txt variant="caption" color={colors.onSurfaceVariant} style={{ marginBottom: 12 }}>
                  {t("onboarding", "motivationsLead")}
                </Txt>
                <View style={{ gap: 8 }}>
                  {data.motivations.map((m) => {
                    const on = goals.includes(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleGoal(m.id)}
                        style={({ pressed }) => [s.goal, on && s.goalOn, pressed && { opacity: 0.8 }]}
                      >
                        <View style={[s.checkbox, on && s.checkboxOn]}>
                          {on ? <Icon name="check" size={13} color={colors.onPrimary} /> : null}
                        </View>
                        <Txt
                          variant="body"
                          color={on ? colors.onPrimaryFixed : colors.onSurfaceVariant}
                          style={{ flex: 1, fontWeight: on ? "600" : "400" }}
                        >
                          {m.label}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <View style={s.levelHeader}>
                  <Txt variant="heading">{t("onboarding", "levelTitle")}</Txt>
                  <Chip
                    label={`${t("onboarding", "levelRecommendation")} ${level}`}
                    tone="tertiary"
                  />
                </View>
                <View style={s.levelGrid}>
                  {data.levels.map((lv) => {
                    const on = level === lv.code;
                    return (
                      <Pressable
                        key={lv.code}
                        onPress={() => setLevel(lv.code)}
                        style={({ pressed }) => [s.level, on && s.levelOn, pressed && { opacity: 0.8 }]}
                      >
                        <Txt variant="caption" style={{ fontWeight: "700" }}>
                          {lv.label}{" "}
                          <Txt variant="caption" color={colors.onSurfaceVariant}>
                            ({lv.code})
                          </Txt>
                        </Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {lv.hint}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.note}>
                  <Txt variant="caption" color={colors.onSurfaceVariant}>
                    {t("onboarding", "levelNote")}
                  </Txt>
                </View>
              </View>
            </ScrollView>

            <SafeAreaView edges={["bottom"]} style={s.footer}>
              <Button
                full
                label={lang ? t("common", "continue") : t("onboarding", "ctaEmpty")}
                icon={lang ? "arrow-forward" : undefined}
                disabled={!lang}
                onPress={() => router.replace("/discover")}
              />
            </SafeAreaView>
          </>
        )}
      </Loader>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 48 },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12, marginLeft: "auto" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 6,
    overflow: "hidden",
  },
  fill: { height: "100%", width: "33%", borderRadius: radius.pill, backgroundColor: colors.primary },

  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 28 },
  intro: { gap: 8, paddingTop: 8 },
  lead: { lineHeight: 20 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },

  langCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  langCardOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed, borderWidth: 2 },
  langIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerHigh,
  },
  langTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBlurb: { lineHeight: 17, fontWeight: "400" },

  goal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  goalOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },

  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  levelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  level: {
    width: "48%",
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  levelOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  note: {
    marginTop: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: 12,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
});
