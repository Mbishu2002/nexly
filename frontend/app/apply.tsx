import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function TeacherApplication() {
  const router = useRouter();
  const { t } = useI18n();
  const query = useQuery((o) => api.getApplication(o));

  const [charter, setCharter] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <SafeAreaView style={s.root} edges={["top", "bottom"]}>
        <View style={s.center}>
          <View style={s.successIcon}>
            <Icon name="how-to-reg" size={38} color={colors.onPrimary} />
          </View>
          <Txt variant="title" style={{ textAlign: "center" }}>
            {t("apply", "doneTitle")}
          </Txt>
          <Txt variant="body" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
            {t("apply", "doneBody")}
          </Txt>
          <View style={{ gap: 10, alignSelf: "stretch", marginTop: 10 }}>
            <Button
              full
              label={t("apply", "doneCta")}
              icon="school"
              onPress={() => router.replace("/schedule")}
            />
            <Button full variant="text" label={t("common", "back")} onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="arrow-back" size={22} />
        </Pressable>
        <Txt variant="heading" style={{ flex: 1 }}>
          {t("apply", "title")}
        </Txt>
        <Pressable hitSlop={8}>
          <Icon name="help-outline" size={21} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <Loader query={query}>
        {(app) => (
          <>
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
              <Card style={s.pitch}>
                <View style={s.pitchTop}>
                  <Icon name="verified-user" size={19} color={colors.onPrimaryContainer} />
                  <Txt variant="subheading" color={colors.onPrimary} style={{ flex: 1 }}>
                    {t("apply", "pitchTitle")}
                  </Txt>
                  <Chip label={t("apply", "pitchTag")} tone="secondary" />
                </View>
                <Txt
                  variant="caption"
                  color={colors.primaryFixed}
                  style={{ fontWeight: "400", lineHeight: 18 }}
                >
                  {t("apply", "pitchBody")}
                </Txt>
              </Card>

              <View>
                <View style={s.progressHead}>
                  <View>
                    <Txt variant="subheading">{t("apply", "progressTitle")}</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {t("apply", "progressStep")}
                    </Txt>
                  </View>
                  <Chip label={t("apply", "progressPercent")} tone="primary" />
                </View>
                <View style={s.steps}>
                  {app.steps.map((st, i) => (
                    <View key={st.label} style={s.step}>
                      <View style={[s.stepDot, st.done && s.stepDotDone, st.current && s.stepDotCurrent]}>
                        {st.done ? (
                          <Icon name="check" size={13} color={colors.onPrimary} />
                        ) : (
                          <Txt
                            variant="micro"
                            color={st.current ? colors.onPrimary : colors.onSurfaceVariant}
                          >
                            {i + 1}
                          </Txt>
                        )}
                      </View>
                      <Txt
                        variant="micro"
                        color={st.done || st.current ? colors.onSurface : colors.onSurfaceVariant}
                        style={{ fontWeight: st.current ? "700" : "400" }}
                      >
                        {st.label}
                      </Txt>
                    </View>
                  ))}
                </View>
              </View>

              <View>
                <SectionHeader title={t("apply", "videoTitle")} trailing={t("common", "required")} />
                <Card style={{ gap: 12 }}>
                  <View style={s.videoPreview}>
                    <View style={s.play}>
                      <Icon name="play-arrow" size={26} color={colors.onPrimary} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt variant="subheading">{app.video.duration}</Txt>
                      <View style={s.videoMeta}>
                        <Chip label={app.video.quality} tone="neutral" icon="videocam" />
                        <Chip label={app.video.audio} tone="neutral" icon="mic" />
                      </View>
                    </View>
                  </View>

                  <View style={s.guidance}>
                    <View style={s.guidanceTop}>
                      <Icon name="tips-and-updates" size={16} color={colors.onSecondaryFixed} />
                      <Txt variant="micro" color={colors.onSecondaryFixed}>
                        {t("apply", "guidanceTitle")}
                      </Txt>
                    </View>
                    {app.guidance.map((g, i) => (
                      <View key={i} style={s.guidanceRow}>
                        <View style={s.guidanceNum}>
                          <Txt variant="micro" color={colors.onSecondaryFixed}>
                            {i + 1}
                          </Txt>
                        </View>
                        <Txt
                          variant="micro"
                          color={colors.onSecondaryFixed}
                          style={{ flex: 1, fontWeight: "400", lineHeight: 16 }}
                        >
                          {g}
                        </Txt>
                      </View>
                    ))}
                  </View>

                  <View style={s.fileRow}>
                    <Icon name="check-circle" size={17} color={colors.tertiary} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="micro" numberOfLines={1}>
                        {app.video.file}
                      </Txt>
                      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                        {app.video.size}
                      </Txt>
                    </View>
                  </View>

                  <View style={s.videoActions}>
                    <Button
                      variant="outlined"
                      label={t("apply", "watch")}
                      icon="visibility"
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      label={t("apply", "rerecord")}
                      icon="sync"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              </View>

              <View>
                <SectionHeader
                  title={t("apply", "identityTitle")}
                  trailing={t("apply", "verifiedBadge")}
                />
                <Card style={{ gap: 0, padding: 0, overflow: "hidden" }}>
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
                      {d.verified ? (
                        <Chip label={t("apply", "verified")} tone="tertiary" icon="verified" />
                      ) : (
                        <Icon name="edit" size={17} color={colors.outline} />
                      )}
                    </View>
                  ))}
                </Card>
                <View style={s.lockNote}>
                  <Icon name="lock" size={14} color={colors.onSurfaceVariant} />
                  <Txt
                    variant="micro"
                    color={colors.onSurfaceVariant}
                    style={{ flex: 1, fontWeight: "400", lineHeight: 15 }}
                  >
                    {t("apply", "encryptionNote")}
                  </Txt>
                </View>
              </View>

              <View>
                <SectionHeader
                  title={t("apply", "languagesTitle")}
                  trailing={t("apply", "targetedVisibility")}
                />
                <Card style={{ gap: 12 }}>
                  {app.languages.map((l) => (
                    <View key={l.name} style={s.langRow}>
                      <Icon name="translate" size={18} color={colors.primary} />
                      <Txt variant="caption" style={{ flex: 1, fontWeight: "600" }}>
                        {l.name}
                      </Txt>
                      <Chip label={l.level} tone="tertiary" />
                    </View>
                  ))}
                  <View style={s.divider} />
                  <Txt variant="micro" color={colors.onSurfaceVariant}>
                    {t("apply", "basinsTitle")}
                  </Txt>
                  <View style={s.basins}>
                    {app.basins.map((b) => (
                      <Chip key={b} label={b} tone="neutral" icon="location-on" />
                    ))}
                  </View>
                </Card>
              </View>

              <View>
                <SectionHeader title={t("apply", "charterTitle")} trailing={t("apply", "charterTag")} />
                <Pressable onPress={() => setCharter((v) => !v)}>
                  <Card style={[s.charter, charter && s.charterOn]}>
                    <View style={s.charterRow}>
                      <View style={[s.checkbox, charter && s.checkboxOn]}>
                        {charter ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
                      </View>
                      <Txt variant="caption" style={{ flex: 1, fontWeight: "600" }}>
                        {t("apply", "charterAccept")}
                      </Txt>
                    </View>
                    <Txt
                      variant="micro"
                      color={colors.onSurfaceVariant}
                      style={{ fontWeight: "400", lineHeight: 16 }}
                    >
                      {t("apply", "charterBody")}
                    </Txt>
                  </Card>
                </Pressable>
              </View>
            </ScrollView>

            <SafeAreaView edges={["bottom"]} style={s.footer}>
              <View style={s.footerInner}>
                <Button
                  full
                  label={charter ? t("apply", "cta") : t("apply", "ctaEmpty")}
                  icon={charter ? "send" : undefined}
                  disabled={!charter}
                  onPress={async () => {
                    await api.submitApplication();
                    setSubmitted(true);
                  }}
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
  appbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 52 },
  scroll: { padding: 16, paddingBottom: 110, gap: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  successIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  pitch: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 8 },
  pitchTop: { flexDirection: "row", alignItems: "center", gap: 8 },

  progressHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  steps: { flexDirection: "row", justifyContent: "space-between" },
  step: { alignItems: "center", gap: 5, flex: 1 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: { backgroundColor: colors.tertiary },
  stepDotCurrent: { backgroundColor: colors.primary },

  videoPreview: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  videoMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  guidance: { gap: 7, backgroundColor: colors.secondaryFixed, borderRadius: radius.lg, padding: 12 },
  guidanceTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  guidanceRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  guidanceNum: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.secondaryFixedDim,
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: 10,
  },
  videoActions: { flexDirection: "row", gap: 8 },

  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  lockNote: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 10 },

  langRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  basins: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  charter: { gap: 9 },
  charterOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed, borderWidth: 2 },
  charterRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },

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
});
