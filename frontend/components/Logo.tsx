import { Image, type ImageStyle, type StyleProp } from "react-native";

// Static require: Metro resolves image assets at build time, so this cannot be
// a computed path. The mark is the elephant alone -- the wordmark is set in
// text beside it, so it stays crisp and translatable.
const MARK = require("../assets/mark.png");

// Intrinsic aspect of assets/mark.png (512x435). Kept here so callers only
// ever pass a height and the width follows.
const ASPECT = 512 / 435;

/** The Nexly brand mark, sized by height. */
export default function Logo({
  size = 28,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={MARK}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Nexly"
      style={[{ height: size, width: size * ASPECT }, style]}
    />
  );
}
