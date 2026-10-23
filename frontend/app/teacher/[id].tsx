import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, Chip, Icon, Rating, SectionHeader, Txt } from "@/components/ui";
import { Loader } from "@/components/Screen";
import { api, useQuery } from "@/hooks/useApi";
import { useI18n } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function TeacherProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const teacherQuery = useQuery((o) => api.getTeacher(id, o), [id]);
  const reviewsQuery = useQuery((o) => api.listReviews(id, o), [id]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Loader query={teacherQuery}>
        {(teacher) => {
          if (!teacher) {
            return (
              <View style={s.missing}>
                <Icon name="person-off" size={32} color={colors.onSurfaceVariant} />
                <Txt variant="body" color={colors.onSurfaceVariant}>
                  {t("teacher", "notFound")}
                </Txt>
                <Button variant="outlined" label={t("common", "back")} onPress={() => router.back()} />
              </View>
            );
          }

          return (
            <>
              <View style={s.appbar}>
                <Pressable hitSlop={8} onPress={() => router.back()}>
                  <Icon name="arrow-back" size={22} />
                </Pressable>
                <Txt variant="heading" numberOfLines={1} style={{ flex: 1 }}>
                  {teacher.name}
                </Txt>
                <Pressable hitSlop={8}>
                  <Icon name="favorite-border" size={22} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.hero}>
                  <Avatar name={teacher.name} uri={teacher.avatar} size={84} />
                  <View style={s.nameRow}>
                    <Txt variant="title">{teacher.name}</Txt>
                    <Icon name="verified" size={18} color={colors.primary} />
                  </View>
                  <Txt variant="caption" color={colors.onSurfaceVariant} style={{ textAlign: "center" }}>
                    {teacher.headline}
                  </Txt>
                  <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                    {teacher.credential}
                  </Txt>
                  <View style={s.heroMeta}>
                    <Rating value={teacher.rating} count={teacher.reviews} />
                    <Txt variant="caption" color={colors.onSurfaceVariant}>
                      · {teacher.city}
                    </Txt>
                  </View>
                  <View style={s.tags}>
                    {teacher.tags.map((tag) => (
                      <Chip key={tag} label={tag} tone="primary" />
                    ))}
                  </View>
                </View>

                <Card style={s.video}>
                  <View style={s.play}>
                    <Icon name="play-arrow" size={26} color={colors.onPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="subheading">{t("teacher", "videoTitle")}</Txt>
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {teacher.sampleLabel}
                    </Txt>
                  </View>
                  <Icon name={teacher.sampleIcon} size={20} color={colors.onSurfaceVariant} />
                </Card>

                <View>
                  <SectionHeader title={t("teacher", "languagesTaught")} />
                  <View style={{ gap: 8 }}>
                    {teacher.skills.map((sk) => (
                      <View key={sk.label} style={s.skillRow}>
                        <Icon name="record-voice-over" size={18} color={colors.primary} />
                        <Txt variant="body" style={{ flex: 1 }}>
                          {sk.label}
                        </Txt>
                        <Chip label={sk.level} tone="tertiary" />
                      </View>
                    ))}
                  </View>
                </View>

                <Card style={s.availability}>
                  <View style={s.availRow}>
                    <Icon name={teacher.availability.icon} size={18} color={colors.tertiary} />
                    <Txt variant="caption" color={colors.onSurfaceVariant}>
                      {teacher.availability.label}
                    </Txt>
                  </View>
                  <Txt variant="heading">{teacher.availability.value}</Txt>
                  {teacher.availability.note ? (
                    <Txt variant="micro" color={colors.onSurfaceVariant} style={{ fontWeight: "400" }}>
                      {teacher.availability.note}
                    </Txt>
                  ) : null}
                  <Chip label={teacher.trial} tone="secondary" icon="bolt" />
                </Card>

                <View>
                  <SectionHeader
                    title={t("teacher", "reviewsTitle")}
                    trailing={`${teacher.reviews} ${t("teacher", "reviewsTotal")}`}
                  />
                  <Loader query={reviewsQuery}>
                    {(reviews) => (
                      <View style={{ gap: 12 }}>
                        {reviews.map((r) => (
                          <Card key={r.id} style={{ gap: 8 }}>
                            <View style={s.reviewTop}>
                              <Avatar name={r.name} size={36} />
                              <View style={{ flex: 1 }}>
                                <Txt variant="subheading">{r.name}</Txt>
                                <Txt
                                  variant="micro"
                                  color={colors.onSurfaceVariant}
                                  style={{ fontWeight: "400" }}
                                >
                                  {r.when}
                                </Txt>
                              </View>
                              <View style={s.stars}>
                                {Array.from({ length: r.rating }).map((_, i) => (
                                  <Icon key={i} name="star" size={13} color={colors.secondaryContainer} />
                                ))}
                              </View>
                            </View>
                            <Txt
                              variant="caption"
                              color={colors.onSurfaceVariant}
                              style={{ lineHeight: 18, fontWeight: "400" }}
                            >
                              {r.text}
                            </Txt>
                          </Card>
                        ))}
                      </View>
                    )}
                  </Loader>
                </View>
              </ScrollView>

              <SafeAreaView edges={["bottom"]} style={s.footer}>
                <View style={s.footerInner}>
                  <Button
                    variant="outlined"
                    label={t("common", "message")}
                    icon="chat-bubble-outline"
                    style={{ flex: 1 }}
                    onPress={() => router.push("/messages")}
                  />
                  <Button
                    label={t("teacher", "bookCta")}
                    icon="calendar-today"
                    style={{ flex: 1.4 }}
                    onPress={() => router.push(`/book/${teacher.id}`)}
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
  appbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 52 },
  scroll: { padding: 16, paddingBottom: 110, gap: 24 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  hero: { alignItems: "center", gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 2 },

  video: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  availability: { gap: 6, backgroundColor: colors.tertiaryFixed, borderColor: colors.tertiaryFixedDim },
  availRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  stars: { flexDirection: "row", gap: 1 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerInner: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 },
});
