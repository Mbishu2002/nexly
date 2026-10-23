import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import TeacherHeader from "@/components/TeacherHeader";
import RevenueChart from "@/components/RevenueChart";
import { api, useQuery } from "@/hooks/useApi";
import { useFormatXaf, useI18n } from "@/lib/i18n";
import { chart, colors, radius } from "@/lib/theme";

export default function TeacherEarnings() {
  const { t, fill } = useI18n();
  const xaf = useFormatXaf();
  const query = useQuery((o) => api.getEarnings(o));

  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState("");
  const [requested, setRequested] = useState(false);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <TeacherHeader title={t("earnings", "header")} />

      <Loader query={query}>
        {(data) => {
          const { wallet, accounts, weekly, sources, movements } = data;
          const primary = accounts[0];
          const amountNum = Number(amount.replace(/\D/g, "")) || 0;
          const overMax = amountNum > wallet.available;

          return (
            <>
              <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.head}>
                  <Txt variant="title">{t("earnings", "title")}</Txt>
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {t("earnings", "lead")}
                  </Txt>
                </View>

                {/* Hero number — the headline figure gets no chart, just weight. */}
                <Card style={s.walletCard}>
                  <View style={s.walletTop}>
                    <Icon name="account-balance-wallet" size={19} color={colors.onPrimaryContainer} />
                    <Txt variant="caption" color={colors.primaryFixed}>
                      {t("earnings", "available")}
                    </Txt>
                  </View>
                  <Txt variant="display" color={colors.onPrimary} style={{ fontSize: 34 }}>
                    {xaf(wallet.available)}
                  </Txt>
                  <View style={s.walletMeta}>
                    <Icon name="event-available" size={14} color={colors.primaryFixedDim} />
                    <Txt variant="micro" color={colors.primaryFixedDim} style={{ fontWeight: "400" }}>
                      {t("earnings", "nextAuto")} {wallet.nextAutoPayout}
                    </Txt>
                  </View>
                  <Button
                    full
                    variant="tonal"
                    label={t("earnings", "requestPayout")}
                    icon="bolt"
                    onPress={() => {
                      setAmount(String(wallet.available));
                      setSheet(true);
                    }}
                  />
                  <View style={s.walletNote}>
                    <Icon name="check-circle" size={13} color={colors.tertiaryFixedDim} />
                    <Txt variant="micro" color={colors.primaryFixed} style={{ fontWeight: "400", flex: 1 }}>
                      {t("earnings", "noFees")}
                    </Txt>
                  </View>
                </Card>

                <View style={s.statRow}>
                  <View style={s.stat}>
                    <View style={s.statTop}>
                      <Icon name="lock-clock" size={15} color={colors.secondary} />
                      <Txt variant="micro" color={colors.onSurfaceVariant}>
                        {t("earnings", "escrow")}
                      </Txt>
                    </View>
                    <Txt variant="heading">{xaf(wallet.escrow)}</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {t("earnings", "escrowHint")}
                    </Txt>
                  </View>
                  <View style={s.stat}>
                    <View style={s.statTop}>
                      <Icon name="trending-up" size={15} color={colors.tertiary} />
                      <Txt variant="micro" color={colors.onSurfaceVariant}>
                        {t("earnings", "monthTotal")}
                      </Txt>
                    </View>
                    <Txt variant="heading">{xaf(wallet.monthTotal)}</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {wallet.sessionsCompleted} {t("earnings", "sessionsCompleted")}
                    </Txt>
                  </View>
                </View>

                <View>
                  <SectionHeader title={t("earnings", "accountsTitle")} trailing={t("earnings", "add")} />
                  <View style={{ gap: 10 }}>
                    {accounts.map((a) => (
                      <Card key={a.id} style={s.account}>
                        <View
                          style={[
                            s.accountBadge,
                            a.id === "orange" && { backgroundColor: colors.secondaryContainer },
                          ]}
                        >
                          <Txt variant="subheading" color={colors.onPrimary}>
                            {a.initial}
                          </Txt>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={s.accountNameRow}>
                            <Txt variant="subheading">{a.name}</Txt>
                            <Chip label={a.tag} tone={a.id === "mtn" ? "primary" : "neutral"} />
                          </View>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {a.masked}
                          </Txt>
                          {a.verified ? (
                            <View style={s.verifiedRow}>
                              <Icon name="security" size={13} color={colors.tertiary} />
                              <Txt variant="micro" color={colors.tertiary} style={{ fontWeight: "400" }}>
                                {t("earnings", "verifiedCni")}
                              </Txt>
                            </View>
                          ) : null}
                        </View>
                        <Icon name="chevron-right" size={19} color={colors.outline} />
                      </Card>
                    ))}
                  </View>
                </View>

                <View>
                  <SectionHeader title={t("earnings", "analysisTitle")} trailing={wallet.monthLabel} />
                  <Card style={{ gap: 12 }}>
                    <Chip label={wallet.trend} tone="tertiary" icon="trending-up" />
                    <RevenueChart data={weekly} />
                  </Card>
                </View>

                <View>
                  <SectionHeader title={t("earnings", "sourcesTitle")} />
                  <Card style={{ gap: 14 }}>
                    {/* Two categories → the validated categorical pair, assigned by
                        entity and direct-labeled so identity is never color-alone. */}
                    <View style={s.shareBar}>
                      {sources.map((src, i) => (
                        <View
                          key={src.id}
                          style={{
                            flex: src.share,
                            backgroundColor: chart.categorical[i % chart.categorical.length],
                            marginRight: i < sources.length - 1 ? 2 : 0,
                            borderTopLeftRadius: i === 0 ? radius.sm / 2 : 0,
                            borderBottomLeftRadius: i === 0 ? radius.sm / 2 : 0,
                            borderTopRightRadius: i === sources.length - 1 ? radius.sm / 2 : 0,
                            borderBottomRightRadius: i === sources.length - 1 ? radius.sm / 2 : 0,
                          }}
                        />
                      ))}
                    </View>
                    {sources.map((src, i) => (
                      <View key={src.id} style={s.legendRow}>
                        <View
                          style={[
                            s.swatch,
                            { backgroundColor: chart.categorical[i % chart.categorical.length] },
                          ]}
                        />
                        <Txt variant="caption" style={{ flex: 1 }}>
                          {src.label}
                        </Txt>
                        <Txt variant="caption" color={colors.onSurfaceVariant}>
                          {Math.round(src.share * 100)}%
                        </Txt>
                        <Txt variant="caption" style={{ fontWeight: "700" }}>
                          {xaf(src.amount)}
                        </Txt>
                      </View>
                    ))}
                  </Card>
                </View>

                <View>
                  <SectionHeader title={t("earnings", "historyTitle")} trailing={t("common", "seeAll")} />
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    {movements.map((m, i) => {
                      const out = m.amount < 0;
                      return (
                        <View
                          key={m.id}
                          style={[s.movement, i < movements.length - 1 && s.movementDivider]}
                        >
                          <View style={[s.movIcon, out && { backgroundColor: colors.surfaceContainerHigh }]}>
                            <Icon
                              name={m.icon}
                              size={17}
                              color={out ? colors.onSurfaceVariant : colors.primary}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 1 }}>
                            <Txt variant="caption" numberOfLines={1} style={{ fontWeight: "600" }}>
                              {m.title}
                            </Txt>
                            <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                              {m.meta}
                            </Txt>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 1 }}>
                            <Txt
                              variant="caption"
                              color={out ? colors.onSurfaceVariant : colors.tertiary}
                              style={{ fontWeight: "700" }}
                            >
                              {out ? "" : "+"}
                              {xaf(Math.abs(m.amount))}
                            </Txt>
                            <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                              {m.state}
                            </Txt>
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                </View>

                <Card style={s.compliance}>
                  <View style={s.complianceTop}>
                    <Icon name="verified-user" size={18} color={colors.tertiary} />
                    <Txt variant="subheading" style={{ flex: 1 }}>
                      {t("earnings", "complianceTitle")}
                    </Txt>
                    <Chip label={t("earnings", "complianceTag")} tone="tertiary" />
                  </View>
                  <Txt
                    variant="micro"
                    color={colors.onSurfaceVariant}
                    style={{ fontWeight: "400", lineHeight: 16 }}
                  >
                    {t("earnings", "complianceBody")}
                  </Txt>
                  <Button
                    variant="outlined"
                    full
                    label={t("earnings", "downloadReceipt")}
                    icon="download"
                  />
                </Card>
              </ScrollView>

              <Modal
                visible={sheet}
                transparent
                animationType="slide"
                onRequestClose={() => setSheet(false)}
              >
                <Pressable style={s.backdrop} onPress={() => setSheet(false)} />
                <SafeAreaView edges={["bottom"]} style={s.sheet}>
                  {requested ? (
                    <View style={s.sheetDone}>
                      <View style={s.successIcon}>
                        <Icon name="check" size={32} color={colors.onPrimary} />
                      </View>
                      <Txt variant="title" style={{ textAlign: "center" }}>
                        {t("earnings", "requestedTitle")}
                      </Txt>
                      <Txt variant="caption" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
                        {xaf(amountNum)} → {primary.name} ({primary.masked.split(" • ")[0]}).{"\n"}
                        {t("earnings", "requestedBody")}
                      </Txt>
                      <Button
                        full
                        label={t("common", "close")}
                        onPress={() => {
                          setSheet(false);
                          setRequested(false);
                        }}
                      />
                    </View>
                  ) : (
                    <>
                      <View style={s.sheetHead}>
                        <View style={{ flex: 1 }}>
                          <Txt variant="heading">{t("earnings", "withdrawTitle")}</Txt>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {t("earnings", "withdrawSubtitle")}
                          </Txt>
                        </View>
                        <Pressable hitSlop={8} onPress={() => setSheet(false)}>
                          <Icon name="close" size={22} />
                        </Pressable>
                      </View>

                      <View style={s.sheetBody}>
                        <Txt variant="micro" color={colors.onSurfaceVariant}>
                          {t("earnings", "destination")}
                        </Txt>
                        <View style={s.dest}>
                          <View style={s.accountBadge}>
                            <Txt variant="subheading" color={colors.onPrimary}>
                              {primary.initial}
                            </Txt>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Txt variant="caption" style={{ fontWeight: "600" }}>
                              {primary.name}
                            </Txt>
                            <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                              {primary.masked}
                            </Txt>
                          </View>
                          <Icon name="check-circle" size={19} color={colors.tertiary} />
                        </View>

                        <View style={s.amountHead}>
                          <Txt variant="micro" color={colors.onSurfaceVariant}>
                            {t("earnings", "amount")}
                          </Txt>
                          <Pressable onPress={() => setAmount(String(wallet.available))}>
                            <Txt variant="micro" color={colors.primary}>
                              {t("earnings", "max")} : {xaf(wallet.available)}
                            </Txt>
                          </Pressable>
                        </View>
                        <View style={[s.amountField, overMax && { borderColor: colors.error }]}>
                          <TextInput
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="number-pad"
                            style={s.amountInput}
                            placeholderTextColor={colors.onSurfaceVariant}
                          />
                          <Txt variant="subheading" color={colors.onSurfaceVariant}>
                            FCFA
                          </Txt>
                        </View>
                        {overMax ? (
                          <Txt variant="micro" color={colors.error} style={{ fontWeight: "400" }}>
                            {t("earnings", "overMax")}
                          </Txt>
                        ) : (
                          <View style={s.feeRow}>
                            <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                              {t("earnings", "fees")}
                            </Txt>
                            <Txt variant="micro" color={colors.tertiary}>
                              {t("common", "free")} (0 FCFA)
                            </Txt>
                          </View>
                        )}

                        <Button
                          full
                          label={t("earnings", "confirmTransfer")}
                          icon="bolt"
                          disabled={overMax || amountNum === 0}
                          onPress={async () => {
                            await api.requestPayout({ accountId: primary.id, amount: amountNum });
                            setRequested(true);
                          }}
                        />
                      </View>
                    </>
                  )}
                </SafeAreaView>
              </Modal>
            </>
          );
        }}
      </Loader>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 16, paddingBottom: 32, gap: 20 },
  head: { gap: 3 },

  walletCard: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 8 },
  walletTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  walletMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  walletNote: { flexDirection: "row", alignItems: "center", gap: 6 },

  statRow: { flexDirection: "row", gap: 10 },
  stat: {
    flex: 1,
    gap: 3,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 13,
  },
  statTop: { flexDirection: "row", alignItems: "center", gap: 5 },

  account: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  accountNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  shareBar: { flexDirection: "row", height: 12, borderRadius: radius.sm / 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swatch: { width: 11, height: 11, borderRadius: 3 },

  movement: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  movementDivider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  movIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
  },

  compliance: { gap: 10, backgroundColor: colors.tertiaryFixed, borderColor: colors.tertiaryFixedDim },
  complianceTop: { flexDirection: "row", alignItems: "center", gap: 8 },

  backdrop: { flex: 1, backgroundColor: "rgba(19,27,46,0.45)" },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  sheetBody: { gap: 8, paddingBottom: 16 },
  dest: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: 11,
    marginBottom: 6,
  },
  amountHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amountField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: "700", color: colors.onSurface, padding: 0 },
  feeRow: { flexDirection: "row", justifyContent: "space-between" },

  sheetDone: { alignItems: "center", gap: 10, paddingBottom: 20 },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
