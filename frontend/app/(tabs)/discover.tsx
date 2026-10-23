import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader, LocaleToggle } from "@/components/Screen";
import Logo from "@/components/Logo";
import TeacherCard from "@/components/TeacherCard";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function Discover() {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  // Filtering and search happen server-side, keyed on stable filter ids rather
  // than translated labels — so switching locale never changes the result set.
  const filters = useQuery((o) => api.listDiscoveryFilters(o));
  const teachers = useQuery((o) => api.listTeachers({ ...o, query, filter }), [query, filter]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <View style={s.brand}>
          <Logo size={26} />
          <Txt variant="title">Nexly</Txt>
        </View>
        <LocaleToggle />
        <Pressable hitSlop={8}>
          <Icon name="notifications" size={22} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroBadges}>
            <Chip label={t("discover", "certified")} icon="verified" tone="tertiary" />
            <Chip label={t("discover", "hub")} tone="primary" />
          </View>
          <Txt variant="display" color={colors.onPrimaryContainer}>
            {t("discover", "heroTitle")}
          </Txt>
          <Txt variant="body" color={colors.primaryFixed} style={{ lineHeight: 20 }}>
            {t("discover", "heroLead")}
          </Txt>
          <View style={s.heroMeta}>
            <Txt variant="micro" color={colors.primaryFixedDim}>
              {t("discover", "heroMentors")}
            </Txt>
          </View>
        </View>

        <View style={s.search}>
          <Icon name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("discover", "searchPlaceholder")}
            placeholderTextColor={colors.onSurfaceVariant}
            style={s.searchInput}
          />
          <Icon name="mic" size={20} color={colors.primary} />
        </View>

        <Loader query={filters}>
          {(list) => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filters}
            >
              {list.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={filter === f.id}
                  onPress={() => setFilter(f.id)}
                />
              ))}
            </ScrollView>
          )}
        </Loader>

        <View style={s.list}>
          <SectionHeader title={t("discover", "listTitle")} trailing={t("discover", "sort")} />
          <Loader query={teachers}>
            {(list) => (
              <View style={{ gap: 16 }}>
                {list.map((teacher) => (
                  <TeacherCard key={teacher.id} teacher={teacher} />
                ))}
                {list.length === 0 ? (
                  <View style={s.empty}>
                    <Icon name="search-off" size={28} color={colors.onSurfaceVariant} />
                    <Txt variant="caption" color={colors.onSurfaceVariant}>
                      {t("discover", "empty")}
                    </Txt>
                  </View>
                ) : null}
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
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, marginRight: "auto" },

  scroll: { paddingBottom: 32, gap: 16 },
  hero: {
    marginHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  heroBadges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  heroMeta: {
    borderTopWidth: 1,
    borderTopColor: colors.onPrimaryFixedVariant,
    paddingTop: 10,
    marginTop: 2,
  },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainer,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, padding: 0 },

  filters: { gap: 8, paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, minHeight: 200 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 32 },
});
