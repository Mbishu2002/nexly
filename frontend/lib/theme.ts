/* Material 3 tokens lifted verbatim from the Stitch "Nexly Language Learning
   Platform" project (seed #295ea8). design/stitch/html/* is the source of
   truth — keep these in sync when the designs change. */

export const colors = {
  primary: "#003e80",
  onPrimary: "#ffffff",
  primaryContainer: "#1e56a0",
  onPrimaryContainer: "#b4cdff",
  primaryFixed: "#d6e3ff",
  primaryFixedDim: "#aac7ff",
  onPrimaryFixed: "#001b3e",
  onPrimaryFixedVariant: "#00458d",
  inversePrimary: "#aac7ff",

  secondary: "#a04100",
  onSecondary: "#ffffff",
  secondaryContainer: "#fc7728",
  onSecondaryContainer: "#5d2300",
  secondaryFixed: "#ffdbcb",
  secondaryFixedDim: "#ffb693",
  onSecondaryFixed: "#341000",
  onSecondaryFixedVariant: "#7a3000",

  tertiary: "#004842",
  onTertiary: "#ffffff",
  tertiaryContainer: "#00625a",
  onTertiaryContainer: "#72dfd1",
  tertiaryFixed: "#89f5e7",
  tertiaryFixedDim: "#6bd8cb",
  onTertiaryFixed: "#00201d",
  onTertiaryFixedVariant: "#005049",

  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  background: "#faf8ff",
  onBackground: "#131b2e",
  surface: "#faf8ff",
  onSurface: "#131b2e",
  surfaceVariant: "#dae2fd",
  onSurfaceVariant: "#424751",
  surfaceBright: "#faf8ff",
  surfaceDim: "#d2d9f4",
  surfaceTint: "#295ea8",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f3ff",
  surfaceContainer: "#eaedff",
  surfaceContainerHigh: "#e2e7ff",
  surfaceContainerHighest: "#dae2fd",
  inverseSurface: "#283044",
  inverseOnSurface: "#eef0ff",

  outline: "#737782",
  outlineVariant: "#c2c6d3",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Type ramp matching the Stitch screens (Inter). */
export const type = {
  display: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "700" },
  subheading: { fontSize: 15, fontWeight: "600" },
  body: { fontSize: 14, fontWeight: "400" },
  caption: { fontSize: 12, fontWeight: "500" },
  micro: { fontSize: 11, fontWeight: "600" },
} as const;

export const shadow = {
  card: {
    shadowColor: "#131b2e",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#131b2e",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/* Chart tokens. The two-series pair below passes all six checks of the dataviz
   validator against the #faf8ff surface (CVD ΔE 22.2 protan, normal-vision 26.2,
   both inside the lightness band, both ≥3:1 contrast). The obvious picks from
   the M3 scheme do NOT pass: primary #003e80 is outside the lightness band, and
   primary↔tertiary is ΔE 12.0 in normal vision — indistinguishable. Re-run
   scripts/validate_palette.js before changing these. */
export const chart = {
  /** Single-series magnitude (weekly revenue bars). */
  sequential: "#295ea8",
  /** Fixed categorical order — assign by entity, never by rank, never cycled. */
  categorical: ["#295ea8", "#a04100"],
  grid: colors.outlineVariant,
  axis: colors.onSurfaceVariant,
} as const;
