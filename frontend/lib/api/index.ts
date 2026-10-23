/* The single seam between the app and its data.
 *
 * Screens import `api` from here and nothing else. To go live against a real
 * backend: set EXPO_PUBLIC_API_URL and flip USE_MOCK to false. No screen
 * changes — both adapters satisfy the same `NexlyApi` contract. */

import { httpAdapter, API_BASE_URL } from "./httpAdapter";
import { mockAdapter } from "./mockAdapter";
import type { NexlyApi } from "./types";

const USE_MOCK = true;

export const api: NexlyApi = USE_MOCK || !API_BASE_URL ? mockAdapter : httpAdapter;

export const isMockData = api === mockAdapter;

export * from "./types";
