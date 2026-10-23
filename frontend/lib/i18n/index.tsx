/* Locale state + the `t` accessor.
 *
 * The locale lives here and flows two ways: into `t(...)` for UI chrome, and
 * into every `api.*` call so the backend resolves content copy. Flipping the
 * FR/EN toggle therefore re-translates chrome AND refetches content.
 *
 * Resolution order on launch:
 *   1. the user's stored choice (AsyncStorage) — an explicit pick always wins
 *   2. the device language, if we support it
 *   3. French — the launch market is Cameroon and the designs are French-first
 *
 * Children are held back until step 1 resolves, so the app never renders one
 * language and visibly flips to another a frame later. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import type { Locale } from "@/lib/api/types";
import { colors } from "@/lib/theme";
import { dictionaries, type Dictionary } from "./strings";

const STORAGE_KEY = "nexly.locale";
const SUPPORTED: Locale[] = ["fr", "en"];

type Section = keyof Dictionary;

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  /** True when the locale came from the device rather than an explicit choice. */
  isDeviceDefault: boolean;
  /** `t("discover", "heroTitle")` — section and key are both checked. */
  t: <S extends Section, K extends keyof Dictionary[S]>(section: S, key: K) => Dictionary[S][K];
  /** Substitutes `{n}` in a template string. */
  fill: (template: string, values: Record<string, string | number>) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED as string[]).includes(value);
}

/** The device's preferred language, if it is one we ship. `getLocales()` is
 *  synchronous, so this is available on the very first render. */
export function detectDeviceLocale(fallback: Locale = "fr"): Locale {
  try {
    for (const l of getLocales()) {
      // languageCode is the bare tag ("fr" from "fr-CM"), which is what we key on.
      if (isLocale(l.languageCode)) return l.languageCode;
    }
  } catch {
    // getLocales can throw on unusual platforms; the fallback covers it.
  }
  return fallback;
}

export function LocaleProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  /** Force a locale (tests, previews). Skips device detection and storage. */
  initial?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initial ?? detectDeviceLocale());
  const [isDeviceDefault, setIsDeviceDefault] = useState(initial === undefined);
  const [hydrated, setHydrated] = useState(initial !== undefined);

  // Step 1: an explicit stored choice overrides the device language.
  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isLocale(stored)) {
          setLocaleState(stored);
          setIsDeviceDefault(false);
        }
      })
      .catch(() => {
        // A storage failure is not fatal — fall through to the device language.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setIsDeviceDefault(false);
    // Fire-and-forget: the UI already reflects the change, and a failed write
    // only costs us the preference on next launch.
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    <S extends Section, K extends keyof Dictionary[S]>(section: S, key: K) =>
      dictionaries[locale][section][key],
    [locale],
  );

  const fill = useCallback(
    (template: string, values: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`)),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === "fr" ? "en" : "fr"),
      isDeviceDefault,
      t,
      fill,
    }),
    [locale, setLocale, isDeviceDefault, t, fill],
  );

  // Hold the first paint until the stored preference is known. This is a single
  // AsyncStorage read, so it is a frame or two, not a visible splash.
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used inside <LocaleProvider>");
  return ctx;
}

/** Locale-aware money formatting. XAF has no decimal subunit. */
export function useFormatXaf() {
  const { locale } = useI18n();
  return useCallback(
    (n: number) =>
      new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(n) + " FCFA",
    [locale],
  );
}

export function formatXafShort(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
}
