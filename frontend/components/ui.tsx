import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadow, type as t } from "@/lib/theme";

export type IconName = keyof typeof MaterialIcons.glyphMap;

export function Icon({
  name,
  size = 22,
  color = colors.onSurface,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}

/* ---------- Text ---------- */

type TxtProps = {
  children: React.ReactNode;
  variant?: keyof typeof t;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function Txt({
  children,
  variant = "body",
  color = colors.onSurface,
  style,
  numberOfLines,
}: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[t[variant] as TextStyle, { color }, style]}>
      {children}
    </Text>
  );
}

/* ---------- Surfaces ---------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const content = <View style={[s.card, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && s.pressed}>
      {content}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = "neutral",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: "neutral" | "primary" | "secondary" | "tertiary";
}) {
  const tones = {
    neutral: { bg: colors.surfaceContainerHigh, fg: colors.onSurfaceVariant },
    primary: { bg: colors.primaryFixed, fg: colors.onPrimaryFixed },
    secondary: { bg: colors.secondaryFixed, fg: colors.onSecondaryFixed },
    tertiary: { bg: colors.tertiaryFixed, fg: colors.onTertiaryFixed },
  }[tone];

  const bg = selected ? colors.primary : tones.bg;
  const fg = selected ? colors.onPrimary : tones.fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.chip, { backgroundColor: bg }, pressed && onPress && s.pressed]}
    >
      {icon ? <Icon name={icon} size={13} color={fg} /> : null}
      <Text style={[t.micro as TextStyle, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Buttons ---------- */

type BtnProps = PressableProps & {
  label: string;
  icon?: IconName;
  variant?: "filled" | "tonal" | "outlined" | "text";
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  icon,
  variant = "filled",
  full,
  style,
  disabled,
  ...rest
}: BtnProps) {
  const palette = {
    filled: { bg: colors.primary, fg: colors.onPrimary, border: "transparent" },
    tonal: { bg: colors.primaryFixed, fg: colors.onPrimaryFixed, border: "transparent" },
    outlined: { bg: "transparent", fg: colors.primary, border: colors.outlineVariant },
    text: { bg: "transparent", fg: colors.primary, border: "transparent" },
  }[variant];

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        {
          backgroundColor: disabled ? colors.surfaceContainerHigh : palette.bg,
          borderColor: palette.border,
          alignSelf: full ? "stretch" : "flex-start",
        },
        pressed && s.pressed,
        style,
      ]}
      {...rest}
    >
      {icon ? (
        <Icon name={icon} size={17} color={disabled ? colors.onSurfaceVariant : palette.fg} />
      ) : null}
      <Text
        style={[
          t.subheading as TextStyle,
          { color: disabled ? colors.onSurfaceVariant : palette.fg },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Misc ---------- */

export function Avatar({
  name,
  size = 48,
  uri,
}: {
  name: string;
  size?: number;
  /** Remote portrait. Falls back to initials if absent or it fails to load. */
  uri?: string;
}) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const shape = { width: size, height: size, borderRadius: size / 2 };

  // The initials tile stays mounted underneath, so a slow or failed network
  // image degrades to the old look instead of a blank circle.
  return (
    <View style={[s.avatar, shape]}>
      <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: size * 0.34 }}>
        {initials}
      </Text>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          accessibilityLabel={name}
          style={[s.avatarImage, shape]}
        />
      ) : null}
    </View>
  );
}

export function Rating({ value, count }: { value: number; count: number }) {
  return (
    <View style={s.row}>
      <Icon name="star" size={15} color={colors.secondaryContainer} />
      <Txt variant="caption" style={{ fontWeight: "700" }}>
        {value.toFixed(2).replace(/\.00$/, ".0")}
      </Txt>
      <Txt variant="caption" color={colors.onSurfaceVariant}>
        ({count})
      </Txt>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }]} />
    </View>
  );
}

export function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Txt variant="heading">{title}</Txt>
      {trailing ? (
        <Txt variant="caption" color={colors.onSurfaceVariant}>
          {trailing}
        </Txt>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadow.card,
  },
  pressed: { opacity: 0.75 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  avatarImage: { position: "absolute", top: 0, left: 0 },
  avatar: {
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
});
