import { StyleSheet, View } from "react-native";
import { Txt } from "./ui";
import { formatXafShort, useI18n } from "@/lib/i18n";
import { chart, colors, radius } from "@/lib/theme";
import type { RevenuePoint } from "@/lib/api/types";

const PLOT_HEIGHT = 108;

/** Weekly revenue, one series → one hue, no legend (the title names it).
    Only the peak week is direct-labeled; the rest are read off the axis, so
    there is never a number on every bar. Bars sit on the baseline with rounded
    data-ends and a gap between them. */
export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const { t } = useI18n();
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value));
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <View style={s.wrap}>
      <View style={s.plot}>
        {/* Recessive reference line at the peak. */}
        <View style={s.gridLine} />
        {data.map((d) => {
          const isPeak = d.label === peak.label;
          return (
            <View key={d.label} style={s.col}>
              <View style={s.barArea}>
                {isPeak ? (
                  <Txt variant="micro" color={colors.onSurface} style={s.peakLabel}>
                    {formatXafShort(d.value)}
                  </Txt>
                ) : null}
                <View
                  style={[
                    s.bar,
                    {
                      height: Math.max(4, (d.value / max) * PLOT_HEIGHT),
                      backgroundColor: chart.sequential,
                    },
                  ]}
                />
              </View>
              <Txt variant="micro" color={chart.axis} style={{ fontWeight: "400" }}>
                {d.label}
              </Txt>
            </View>
          );
        })}
      </View>
      <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
        {t("earnings", "chartCaption")} {formatXafShort(peak.value)} {t("earnings", "chartIn")}{" "}
        {peak.label}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    height: PLOT_HEIGHT + 34,
    paddingTop: 16,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 16,
    height: 1,
    backgroundColor: chart.grid,
  },
  col: { flex: 1, alignItems: "center", gap: 6 },
  barArea: { width: "100%", alignItems: "center", justifyContent: "flex-end", height: PLOT_HEIGHT },
  peakLabel: { marginBottom: 3 },
  bar: {
    width: "72%",
    borderTopLeftRadius: radius.sm / 2,
    borderTopRightRadius: radius.sm / 2,
  },
});
