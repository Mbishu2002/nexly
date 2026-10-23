import { Pressable, StyleSheet, View } from "react-native";
import { Icon, Txt } from "./ui";
import { LocaleToggle } from "./Screen";
import Logo from "./Logo";
import { colors, radius } from "@/lib/theme";

/** Shared "Nexly · Teacher" app bar used across the teacher-side tabs. */
export default function TeacherHeader({ title }: { title: string }) {
  return (
    <View style={s.bar}>
      <View style={s.brand}>
        <Logo size={22} />
        <Txt variant="subheading">Nexly</Txt>
        <View style={s.pill}>
          <Txt variant="micro" color={colors.onSecondaryFixed}>
            Teacher
          </Txt>
        </View>
      </View>
      <Txt variant="micro" color={colors.onSurfaceVariant} numberOfLines={1} style={s.title}>
        {title}
      </Txt>
      <View style={s.right}>
        <LocaleToggle />
        <Pressable hitSlop={8}>
          <Icon name="notifications" size={21} color={colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, height: 52 },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  pill: {
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  title: { flex: 1, textAlign: "right" },
  right: { flexDirection: "row", alignItems: "center", gap: 12 },
});
