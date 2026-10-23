import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Icon, Txt } from "./ui";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { QueryState } from "@/hooks/useApi";

/** Renders children only once data has arrived, with shared loading and error
 *  states so every screen handles a slow or failed fetch the same way. */
export function Loader<T>({
  query,
  children,
}: {
  query: QueryState<T>;
  children: (data: T) => React.ReactNode;
}) {
  const { t } = useI18n();

  if (query.error) {
    return (
      <View style={s.center}>
        <Icon name="cloud-off" size={30} color={colors.onSurfaceVariant} />
        <Txt variant="caption" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
          {t("common", "error")}
        </Txt>
        <Pressable onPress={query.refetch} style={s.retry}>
          <Icon name="refresh" size={16} color={colors.primary} />
          <Txt variant="caption" color={colors.primary}>
            {t("common", "retry")}
          </Txt>
        </Pressable>
      </View>
    );
  }

  if (query.loading && query.data === undefined) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
          {t("common", "loading")}
        </Txt>
      </View>
    );
  }

  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}

/** The FR/EN switch from the Discover header. Flipping it re-translates chrome
 *  and refetches every open query, since locale is a query dependency. */
export function LocaleToggle() {
  const { locale, toggleLocale } = useI18n();

  return (
    <Pressable onPress={toggleLocale} style={s.toggle} hitSlop={6}>
      {(["fr", "en"] as const).map((l) => {
        const on = locale === l;
        return (
          <View key={l} style={[s.segment, on && s.segmentOn]}>
            <Txt variant="micro" color={on ? colors.onSurface : colors.onSurfaceVariant}>
              {l.toUpperCase()}
            </Txt>
          </View>
        );
      })}
    </Pressable>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.pill,
    padding: 2,
  },
  segment: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.surfaceContainerLowest },
});
