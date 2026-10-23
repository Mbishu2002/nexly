import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function Booking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const teacherQuery = useQuery((o) => api.getTeacher(id, o), [id]);
  const daysQuery = useQuery((o) => api.getAvailability(id, o), [id]);
  const typesQuery = useQuery((o) => api.listLessonTypes(o));

  const [type, setType] = useState("trial");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const days = daysQuery.data ?? [];
  const activeDay = days.find((d) => d.date === (day ?? days[0]?.date));
  const activeType = typesQuery.data?.find((x) => x.id === type);

  if (confirmed && activeDay && activeType) {
    return (
      <SafeAreaView style={s.root} edges={["top", "bottom"]}>
        <View style={s.center}>
          <View style={s.successIcon}>
            <Icon name="check" size={40} color={colors.onPrimary} />
          </View>
          <Txt variant="title" style={{ textAlign: "center" }}>
            {t("booking", "doneTitle")}
          </Txt>
          <Txt variant="body" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
            {activeType.label} · {teacherQuery.data?.name}
            {"\n"}
            {activeDay.day} {activeDay.date} — {slot} (WAT/Douala)
          </Txt>
          <Txt variant="caption" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
            {t("booking", "doneReminder")}
          </Txt>
          <View style={{ gap: 10, alignSelf: "stretch", marginTop: 8 }}>
            <Button
              full
              label={t("booking", "seeLessons")}
              icon="calendar-month"
              onPress={() => router.replace("/lessons")}
            />
            <Button
              full
              variant="text"
              label={t("booking", "backToDiscover")}
              onPress={() => router.replace("/discover")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.appbar}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Icon name="close" size={22} />
        </Pressable>
        <Txt variant="heading">{t("booking", "title")}</Txt>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Loader query={teacherQuery}>
          {(teacher) =>
            teacher ? (
              <Card style={s.teacher}>
                <Avatar name={teacher.name} uri={teacher.avatar} size={46} />
                <View style={{ flex: 1 }}>
                  <Txt variant="subheading" numberOfLines={1}>
                    {teacher.name}
                  </Txt>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {teacher.city} · WAT/Douala
                  </Txt>
                </View>
                <Chip label={teacher.trial} tone="secondary" icon="bolt" />
              </Card>
            ) : (
              <Txt variant="caption" color={colors.onSurfaceVariant}>
                {t("teacher", "notFound")}
              </Txt>
            )
          }
        </Loader>

        <View>
          <SectionHeader title={t("booking", "lessonType")} />
          <Loader query={typesQuery}>
            {(types) => (
              <View style={{ gap: 8 }}>
                {types.map((lt) => {
                  const on = type === lt.id;
                  return (
                    <Pressable
                      key={lt.id}
                      onPress={() => setType(lt.id)}
                      style={({ pressed }) => [s.type, on && s.typeOn, pressed && { opacity: 0.8 }]}
                    >
                      <View style={[s.radio, on && s.radioOn]}>
                        {on ? <View style={s.radioDot} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="body" style={{ fontWeight: on ? "700" : "500" }}>
                          {lt.label}
                        </Txt>
                        <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                          {lt.note}
                        </Txt>
                      </View>
                      <Chip label={`${lt.duration} min`} tone="neutral" />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Loader>
        </View>

        <View>
          <SectionHeader title={t("booking", "pickSlot")} trailing={t("booking", "month")} />
          <Loader query={daysQuery}>
            {(list) => (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.days}
                >
                  {list.map((d) => {
                    const on = (day ?? list[0]?.date) === d.date;
                    return (
                      <Pressable
                        key={d.date}
                        onPress={() => {
                          setDay(d.date);
                          setSlot(null);
                        }}
                        style={[s.day, on && s.dayOn]}
                      >
                        <Txt variant="micro" color={on ? colors.onPrimary : colors.onSurfaceVariant}>
                          {d.day}
                        </Txt>
                        <Txt variant="heading" color={on ? colors.onPrimary : colors.onSurface}>
                          {d.date}
                        </Txt>
                        <View
                          style={[s.dot, { backgroundColor: on ? colors.onPrimary : colors.tertiary }]}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={s.slots}>
                  {(activeDay?.slots ?? []).map((x) => {
                    const on = slot === x;
                    return (
                      <Pressable
                        key={x}
                        onPress={() => setSlot(x)}
                        style={({ pressed }) => [s.slot, on && s.slotOn, pressed && { opacity: 0.8 }]}
                      >
                        <Txt variant="caption" color={on ? colors.onPrimary : colors.onSurface}>
                          {x}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                <Txt
                  variant="micro"
                  color={colors.onSurfaceVariant}
                  style={{ fontWeight: "400", marginTop: 8 }}
                >
                  {t("booking", "tzNote")}
                </Txt>
              </>
            )}
          </Loader>
        </View>

        {/* No price or checkout here — per _ARCHITECTURE_PLAN.md §3 the app books
            against Pass credits and leaves payment to the web experience. */}
        <Card style={s.passNote}>
          <View style={s.passRow}>
            <Icon name="confirmation-number" size={19} color={colors.tertiary} />
            <Txt variant="subheading">{t("booking", "passTitle")}</Txt>
          </View>
          <Txt
            variant="caption"
            color={colors.onSurfaceVariant}
            style={{ fontWeight: "400", lineHeight: 18 }}
          >
            {t("booking", "passBody")}
          </Txt>
        </Card>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={s.footer}>
        <View style={s.footerInner}>
          <Button
            full
            label={
              slot && activeDay
                ? `${t("booking", "confirm")} ${activeDay.day} ${activeDay.date} · ${slot}`
                : t("booking", "ctaEmpty")
            }
            icon={slot ? "check" : undefined}
            disabled={!slot}
            onPress={async () => {
              if (!slot || !activeDay) return;
              await api.createBooking({
                teacherId: id,
                type,
                date: activeDay.date,
                slot,
              });
              setConfirmed(true);
            }}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  appbar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, height: 52 },
  scroll: { padding: 16, paddingBottom: 110, gap: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  teacher: { flexDirection: "row", alignItems: "center", gap: 12 },

  type: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.primaryFixed },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  days: { gap: 8, paddingBottom: 4 },
  day: {
    width: 58,
    alignItems: "center",
    gap: 3,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dot: { width: 5, height: 5, borderRadius: 3 },

  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  slot: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  passNote: { gap: 8, backgroundColor: colors.tertiaryFixed, borderColor: colors.tertiaryFixedDim },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8 },

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
