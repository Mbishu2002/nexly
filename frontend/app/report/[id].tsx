import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function SafetyReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, fill } = useI18n();
  const query = useQuery((o) => api.getReportContext(id, o), [id]);

  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [attached, setAttached] = useState(true);
  const [toggles, setToggles] = useState<Record<string, boolean> | null>(null);
  const [sent, setSent] = useState(false);

  const ctx = query.data;

  // Defaults come from the server, so policy changes don't need an app release.
  useEffect(() => {
    if (ctx && toggles === null) {
      setToggles(Object.fromEntries(ctx.protections.map((p) => [p.id, p.defaultOn])));
    }
  }, [ctx, toggles]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={query}>
        {(data) => {
          const active = toggles ?? Object.fromEntries(data.protections.map((p) => [p.id, p.defaultOn]));
          const shortfall = Math.max(0, data.minDetailChars - details.trim().length);
          const canSubmit = reason !== null && shortfall === 0;

          if (sent) {
            const applied = data.protections.filter((p) => active[p.id]);
            return (
              <View style={s.center}>
                <View style={s.successIcon}>
                  <Icon name="shield" size={36} color={colors.onPrimary} />
                </View>
                <Txt variant="title" style={{ textAlign: "center" }}>
                  {t("report", "sentTitle")}
                </Txt>
                <Txt variant="body" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
                  {t("report", "ref")} {data.target.ref}. {t("report", "sentBody")}
                </Txt>

                {applied.length ? (
                  <Card style={s.appliedCard}>
                    <Txt variant="micro" color={colors.onSurfaceVariant}>
                      {t("report", "appliedTitle")}
                    </Txt>
                    {applied.map((a) => (
                      <View key={a.id} style={s.appliedRow}>
                        <Icon name="check-circle" size={16} color={colors.tertiary} />
                        <Txt variant="caption" style={{ flex: 1, fontWeight: "400" }}>
                          {a.label}
                        </Txt>
                      </View>
                    ))}
                  </Card>
                ) : null}

                <View style={{ gap: 10, alignSelf: "stretch", marginTop: 6 }}>
                  <Button full label={t("review", "home")} onPress={() => router.replace("/discover")} />
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
                <View style={{ flex: 1 }}>
                  <Txt variant="heading">{t("report", "title")}</Txt>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {t("report", "platform")}
                  </Txt>
                </View>
              </View>

              <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Card style={s.promise}>
                  <View style={s.promiseTop}>
                    <Icon name="verified-user" size={20} color={colors.onTertiaryFixed} />
                    <Txt variant="subheading" color={colors.onTertiaryFixed} style={{ flex: 1 }}>
                      {data.promise.headline}
                    </Txt>
                  </View>
                  <Txt
                    variant="caption"
                    color={colors.onTertiaryFixedVariant}
                    style={{ fontWeight: "400", lineHeight: 18 }}
                  >
                    {data.promise.body}
                  </Txt>
                  <View style={s.promiseChips}>
                    <Chip label={data.promise.sla} tone="tertiary" icon="schedule" />
                    <Chip label={data.promise.compliance} tone="neutral" icon="verified" />
                  </View>
                </Card>

                <View>
                  <SectionHeader title={t("report", "targetTitle")} trailing={data.target.kind} />
                  <Card style={s.target}>
                    <View style={s.targetBadge}>
                      <Icon name="priority-high" size={20} color={colors.onError} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={s.targetNameRow}>
                        <Txt variant="subheading" numberOfLines={1}>
                          {data.target.person}
                        </Txt>
                        <Chip label={data.target.role} tone="neutral" />
                      </View>
                      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                        {data.target.subject}
                      </Txt>
                      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                        {t("report", "ref")} : {data.target.ref} • {data.target.when}
                      </Txt>
                    </View>
                  </Card>
                </View>

                <View>
                  <SectionHeader title={t("report", "reasonTitle")} trailing={t("common", "required")} />
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={s.sectionLead}>
                    {t("report", "reasonLead")}
                  </Txt>
                  <View style={{ gap: 9 }}>
                    {data.reasons.map((r) => {
                      const on = reason === r.id;
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => setReason(r.id)}
                          style={({ pressed }) => [
                            s.reason,
                            on && s.reasonOn,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <View style={[s.radio, on && s.radioOn]}>
                            {on ? <Icon name="check" size={13} color={colors.onPrimary} /> : null}
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Txt variant="caption" style={{ fontWeight: on ? "700" : "600" }}>
                              {r.label}
                            </Txt>
                            <Txt
                              variant="micro"
                              color={colors.onSurfaceVariant}
                              style={{ fontWeight: "400", lineHeight: 16 }}
                            >
                              {r.detail}
                            </Txt>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <SectionHeader
                    title={t("report", "detailsTitle")}
                    trailing={
                      shortfall
                        ? fill(t("report", "detailsMin"), { n: data.minDetailChars })
                        : t("report", "detailsOk")
                    }
                  />
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={s.sectionLead}>
                    {t("report", "detailsLead")}
                  </Txt>
                  <TextInput
                    value={details}
                    onChangeText={setDetails}
                    multiline
                    placeholder={t("report", "detailsPlaceholder")}
                    placeholderTextColor={colors.onSurfaceVariant}
                    style={[s.details, shortfall === 0 && details.length > 0 && s.detailsOk]}
                  />
                  {shortfall > 0 && details.length > 0 ? (
                    <Txt variant="micro" color={colors.error} style={{ fontWeight: "400", marginTop: 6 }}>
                      {fill(t("report", "detailsShortfall"), { n: shortfall })}
                    </Txt>
                  ) : null}
                </View>

                <View>
                  <SectionHeader
                    title={t("report", "evidenceTitle")}
                    trailing={t("report", "evidenceAuto")}
                  />
                  <Card style={s.evidence}>
                    <View style={s.evidenceRow}>
                      <Icon name="videocam" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="caption" style={{ fontWeight: "600" }}>
                          {t("report", "sessionLog")}
                        </Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {data.target.rtcRoom}
                        </Txt>
                      </View>
                      <Icon name="cloud-done" size={18} color={colors.tertiary} />
                    </View>

                    <View style={s.divider} />

                    {attached ? (
                      <View style={s.evidenceRow}>
                        <Icon name="image" size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Txt variant="caption" style={{ fontWeight: "600" }} numberOfLines={1}>
                            {data.attachment.name}
                          </Txt>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {data.attachment.size} • {t("report", "readyToSend")}
                          </Txt>
                        </View>
                        <Pressable hitSlop={8} onPress={() => setAttached(false)}>
                          <Icon name="close" size={18} color={colors.onSurfaceVariant} />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={s.evidenceRow} onPress={() => setAttached(true)}>
                        <Icon name="add-photo-alternate" size={18} color={colors.primary} />
                        <Txt variant="caption" style={{ flex: 1, fontWeight: "400" }}>
                          {t("report", "attachHint")}
                        </Txt>
                        <Icon name="chevron-right" size={18} color={colors.outline} />
                      </Pressable>
                    )}
                  </Card>
                </View>

                <View>
                  <SectionHeader title={t("report", "protectionsTitle")} />
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={s.sectionLead}>
                    {t("report", "protectionsLead")}
                  </Txt>
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    {data.protections.map((p, i) => {
                      const on = active[p.id];
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setToggles({ ...active, [p.id]: !on })}
                          style={[s.protection, i < data.protections.length - 1 && s.divider]}
                        >
                          <Icon
                            name={p.icon}
                            size={19}
                            color={on ? colors.primary : colors.onSurfaceVariant}
                          />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Txt variant="caption" style={{ fontWeight: "600" }}>
                              {p.label}
                            </Txt>
                            <Txt
                              variant="micro"
                              color={colors.onSurfaceVariant}
                              style={{ fontWeight: "400", lineHeight: 16 }}
                            >
                              {p.detail}
                            </Txt>
                          </View>
                          <View style={[s.switch, on && s.switchOn]}>
                            <View style={[s.knob, on && s.knobOn]} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </Card>
                </View>

                <View style={s.legal}>
                  <Icon name="shield" size={15} color={colors.onSurfaceVariant} />
                  <Txt
                    variant="micro"
                    color={colors.onSurfaceVariant}
                    style={{ flex: 1, fontWeight: "400", lineHeight: 16 }}
                  >
                    {t("report", "legal")}
                  </Txt>
                </View>
              </ScrollView>

              <SafeAreaView edges={["bottom"]} style={s.footer}>
                <View style={s.footerInner}>
                  <Button
                    full
                    label={
                      reason === null
                        ? t("report", "ctaReason")
                        : shortfall > 0
                          ? fill(t("report", "ctaChars"), { n: shortfall })
                          : t("report", "cta")
                    }
                    icon={canSubmit ? "send" : undefined}
                    disabled={!canSubmit}
                    onPress={async () => {
                      await api.submitReport({
                        sessionId: id,
                        reason: reason!,
                        details,
                        protections: Object.keys(active).filter((k) => active[k]),
                        attachment: attached,
                      });
                      setSent(true);
                    }}
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
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, height: 56 },
  scroll: { padding: 16, paddingBottom: 110, gap: 22 },
  sectionLead: { fontWeight: "400", marginTop: -6, marginBottom: 11, lineHeight: 18 },

  promise: { gap: 9, backgroundColor: colors.tertiaryFixed, borderColor: colors.tertiaryFixedDim },
  promiseTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  promiseChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  target: { flexDirection: "row", alignItems: "center", gap: 12 },
  targetBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  targetNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  reason: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  reasonOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed, borderWidth: 2 },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },

  details: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 13,
    minHeight: 104,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    textAlignVertical: "top",
  },
  detailsOk: { borderColor: colors.tertiary },

  evidence: { padding: 0, overflow: "hidden" },
  evidenceRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },

  protection: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
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

  legal: { flexDirection: "row", alignItems: "flex-start", gap: 8 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, padding: 24 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appliedCard: { alignSelf: "stretch", gap: 8, marginTop: 6 },
  appliedRow: { flexDirection: "row", alignItems: "center", gap: 8 },

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
