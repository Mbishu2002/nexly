import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Button, Card, Chip, Icon, Rating, Txt } from "./ui";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import type { Teacher } from "@/lib/api/types";

export default function TeacherCard({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Card style={s.card}>
      <View style={s.sampleStrip}>
        <View style={s.play}>
          <Icon name="play-arrow" size={18} color={colors.onPrimary} />
        </View>
        <Icon name={teacher.sampleIcon} size={15} color={colors.onSurfaceVariant} />
        <Txt variant="micro" color={colors.onSurfaceVariant}>
          {teacher.sampleLabel}
        </Txt>
        <View style={{ marginLeft: "auto" }}>
          <Chip label={teacher.badge} tone="tertiary" />
        </View>
      </View>

      <View style={s.identity}>
        <Avatar name={teacher.name} uri={teacher.avatar} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.nameRow}>
            <Txt variant="subheading" numberOfLines={1}>
              {teacher.name}
            </Txt>
            <Icon name="verified" size={15} color={colors.primary} />
          </View>
          <Txt variant="caption" color={colors.onSurfaceVariant} numberOfLines={2}>
            {teacher.headline} • {teacher.city}
          </Txt>
          <Rating value={teacher.rating} count={teacher.reviews} />
        </View>
      </View>

      <View style={s.skills}>
        {teacher.skills.map((sk) => (
          <View key={sk.label} style={s.skill}>
            <Txt variant="micro">{sk.label}</Txt>
            <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
              {sk.level}
            </Txt>
          </View>
        ))}
      </View>

      <View style={s.availability}>
        <Icon name={teacher.availability.icon} size={16} color={colors.tertiary} />
        <Txt variant="caption" color={colors.onSurfaceVariant}>
          {teacher.availability.label}
        </Txt>
        <Txt variant="caption" style={{ fontWeight: "700" }}>
          {teacher.availability.value}
        </Txt>
        {teacher.availability.note ? (
          <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
            {teacher.availability.note}
          </Txt>
        ) : null}
      </View>

      {/* No price here, by design. Per _ARCHITECTURE_PLAN.md section 6 the app
          must not display pricing, checkout or subscription upgrades anywhere:
          showing a rate would pull the iOS build into Apple's in-app purchase
          rules. Packages are bought on the web and spent here as Pass credits. */}
      <View style={s.priceBlock}>
        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
          {t("common", "perLesson")} · {teacher.trial}
        </Txt>
      </View>

      <View style={s.actions}>
        <Button
          variant="outlined"
          label={t("discover", "viewProfile")}
          icon="person"
          style={{ flex: 1 }}
          onPress={() => router.push(`/teacher/${teacher.id}`)}
        />
        <Button
          label={t("discover", "book")}
          icon="calendar-today"
          style={{ flex: 1 }}
          onPress={() => router.push(`/book/${teacher.id}`)}
        />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  sampleStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  play: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availability: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    backgroundColor: colors.tertiaryFixed,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  priceBlock: { gap: 1 },
  actions: { flexDirection: "row", gap: 8 },
});
