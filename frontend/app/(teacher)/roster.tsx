import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Icon,
  ProgressBar,
  SectionHeader,
  Txt,
} from "@/components/ui";
import { Loader } from "@/components/Screen";
import TeacherHeader from "@/components/TeacherHeader";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { RosterStatus } from "@/lib/api/types";

const statusTone: Record<RosterStatus, "primary" | "secondary" | "tertiary" | "neutral"> = {
  active: "tertiary",
  pending: "secondary",
  new: "primary",
  inactive: "neutral",
};

export default function TeacherRoster() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const profile = useQuery((o) => api.getTeacherProfile(o));
  const filters = useQuery((o) => api.listRosterFilters(o));
  const learners = useQuery((o) => api.listLearners({ ...o, status: filter, query }), [filter, query]);
  const resources = useQuery((o) => api.listTeacherResources(o));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <TeacherHeader title={t("roster", "header")} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <Txt variant="title">{t("roster", "header")}</Txt>
          <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
            {profile.data?.learners ?? "—"} {t("roster", "lead")}
          </Txt>
        </View>

        <View style={s.search}>
          <Icon name="search" size={19} color={colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("roster", "searchPlaceholder")}
            placeholderTextColor={colors.onSurfaceVariant}
            style={s.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="cancel" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        <Loader query={filters}>
          {(list) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
              {list.map((f) => (
                <Chip
                  key={f.id}
                  label={`${f.label} (${f.count})`}
                  selected={filter === f.id}
                  onPress={() => setFilter(f.id)}
                />
              ))}
            </ScrollView>
          )}
        </Loader>

        <Card style={s.invite}>
          <View style={s.inviteTop}>
            <Icon name="add-link" size={19} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="subheading">{t("roster", "inviteTitle")}</Txt>
              <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                {t("roster", "inviteBody")}
              </Txt>
            </View>
          </View>
          <View style={s.linkRow}>
            <Txt
              variant="micro"
              color={colors.onSurfaceVariant}
              numberOfLines={1}
              style={{ flex: 1, fontWeight: "400" }}
            >
              nexly.edu/t/henriette-m/session
            </Txt>
            <Button
              variant="tonal"
              label={copied ? t("common", "copied") : t("common", "copy")}
              icon={copied ? "check" : "content-copy"}
              onPress={() => setCopied(true)}
            />
          </View>
          {copied ? (
            <View style={s.copied}>
              <Icon name="check-circle" size={14} color={colors.tertiary} />
              <Txt variant="micro" color={colors.onTertiaryFixed} style={{ fontWeight: "400" }}>
                {t("roster", "inviteCopied")}
              </Txt>
            </View>
          ) : null}
        </Card>

        <View>
          <SectionHeader title={t("roster", "listTitle")} trailing={t("roster", "sortUrgency")} />
          <Loader query={learners}>
            {(list) => (
              <View style={{ gap: 12, minHeight: 120 }}>
                {list.map((l) => (
                  <Card key={l.id} style={{ gap: 11 }}>
                    <View style={s.learnerTop}>
                      <Avatar name={l.name} size={46} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={s.learnerNameRow}>
                          <Txt variant="subheading" numberOfLines={1}>
                            {l.flag} {l.name}
                          </Txt>
                          <Chip label={l.statusLabel} tone={statusTone[l.status]} />
                        </View>
                        <Txt variant="caption" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {l.course}
                        </Txt>
                      </View>
                    </View>

                    <View style={s.metaRow}>
                      <Icon name={l.whenIcon} size={15} color={colors.primary} />
                      <Txt variant="micro" style={{ flex: 1 }}>
                        {l.when}
                      </Txt>
                      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                        {l.progressLabel}
                      </Txt>
                    </View>

                    {l.progress !== undefined ? (
                      <View style={{ gap: 5 }}>
                        <View style={s.progressLabel}>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {t("roster", "phoneticProgress")}
                          </Txt>
                          <Txt variant="micro" color={colors.primary}>
                            {Math.round(l.progress * 100)}%
                          </Txt>
                        </View>
                        <ProgressBar value={l.progress} />
                      </View>
                    ) : null}

                    {l.note ? (
                      <View
                        style={[
                          s.note,
                          l.noteKind === "info" && { backgroundColor: colors.surfaceContainerHigh },
                          l.noteKind === "goal" && { backgroundColor: colors.secondaryFixed },
                        ]}
                      >
                        <Icon
                          name={
                            l.noteKind === "audio"
                              ? "mic"
                              : l.noteKind === "goal"
                                ? "celebration"
                                : l.noteKind === "info"
                                  ? "info"
                                  : "edit-note"
                          }
                          size={15}
                          color={colors.onSurfaceVariant}
                        />
                        <Txt
                          variant="micro"
                          color={colors.onSurfaceVariant}
                          style={{ flex: 1, fontWeight: "400", lineHeight: 16 }}
                        >
                          {l.note}
                        </Txt>
                      </View>
                    ) : null}

                    {l.attachment ? (
                      <View style={s.attachment}>
                        <View style={s.play}>
                          <Icon name="play-arrow" size={16} color={colors.onPrimary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt variant="micro" numberOfLines={1}>
                            {l.attachment.label}
                          </Txt>
                          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                            {l.attachment.duration}
                          </Txt>
                        </View>
                        <Button variant="text" label={t("roster", "rate")} icon="rate-review" />
                      </View>
                    ) : null}

                    <View style={s.learnerActions}>
                      <Button
                        variant="outlined"
                        label={t("roster", "folder")}
                        icon="folder-shared"
                        style={{ flex: 1 }}
                      />
                      <Button
                        label={
                          l.status === "inactive"
                            ? t("roster", "friendlyMessage")
                            : t("roster", "chatHomework")
                        }
                        icon={l.status === "inactive" ? "mail" : "chat"}
                        style={{ flex: 1.2 }}
                      />
                    </View>
                  </Card>
                ))}

                {list.length === 0 ? (
                  <View style={s.empty}>
                    <Icon name="group-off" size={28} color={colors.onSurfaceVariant} />
                    <Txt variant="caption" color={colors.onSurfaceVariant}>
                      {t("roster", "empty")}
                    </Txt>
                  </View>
                ) : null}
              </View>
            )}
          </Loader>
        </View>

        <View>
          <SectionHeader title={t("roster", "resourcesTitle")} trailing={t("roster", "resourcesHint")} />
          <Loader query={resources}>
            {(list) => (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {list.map((r, i) => (
                  <View key={r.id} style={[s.resource, i < list.length - 1 && s.resourceDivider]}>
                    <Icon name={r.icon} size={19} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="body">{r.title}</Txt>
                      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                        {r.hint}
                      </Txt>
                    </View>
                    <Icon name="chevron-right" size={19} color={colors.outline} />
                  </View>
                ))}
              </Card>
            )}
          </Loader>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: 16, paddingBottom: 32, gap: 18 },
  head: { gap: 3 },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, padding: 0 },
  filters: { gap: 8 },

  invite: { gap: 11, backgroundColor: colors.surfaceContainerLow },
  inviteTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  copied: { flexDirection: "row", alignItems: "center", gap: 6 },

  learnerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  learnerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: 10,
  },
  attachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  play: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  learnerActions: { flexDirection: "row", gap: 8 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28 },

  resource: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  resourceDivider: { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
});
