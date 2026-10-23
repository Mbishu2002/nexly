/* Data-fetching hook.
 *
 * Deliberately small — no cache, no dedupe. When the app gets a real backend,
 * swap the body for TanStack Query and keep the call sites identical. The locale
 * is part of the dependency list, so flipping FR/EN refetches automatically. */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Locale, RequestOptions } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";

export type QueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
};

/**
 * `useQuery(({ locale }) => api.listTeachers({ locale }), [])`
 *
 * `deps` are the values besides locale that should trigger a refetch.
 */
export function useQuery<T>(
  fetcher: (options: RequestOptions) => Promise<T>,
  deps: readonly unknown[] = [],
): QueryState<T> {
  const { locale } = useI18n();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    fetcher({ locale })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `fetcher` is intentionally excluded: call sites pass an inline closure, so
    // including it would refetch on every render. `deps` is the explicit list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, nonce, ...deps]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, refetch };
}

/** For writes: exposes a pending flag and surfaces failures to the caller. */
export function useMutation<TInput, TResult>(
  mutate: (input: TInput, options: RequestOptions) => Promise<TResult>,
) {
  const { locale } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const run = useCallback(
    async (input: TInput): Promise<TResult | undefined> => {
      setPending(true);
      setError(undefined);
      try {
        return await mutate(input, { locale });
      } catch (e: unknown) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [mutate, locale],
  );

  return { run, pending, error };
}

/** Re-exported so screens that only need the raw client don't reach past this. */
export { api };
export type { Locale };
