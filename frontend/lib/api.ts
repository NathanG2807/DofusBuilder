import { clearAccessToken, getAccessToken } from "@/lib/auth";
import type {
  ActiveSetDetail,
  BuildCreatePayload,
  BuildOut,
  FullBuild,
  ItemOut,
  ItemSetListResponse,
  ItemSetOut,
  OptimizationRequest,
  ItemListResponse,
  UserPublic,
} from "@/types/api";

export function getApiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  return b.replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const t = getAccessToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function parseError(r: Response): Promise<string> {
  const data = await r.json().catch(() => ({}));
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  return JSON.stringify(detail ?? data) || `HTTP ${r.status}`;
}

export async function authRegister(body: {
  username: string;
  email: string;
  password: string;
}): Promise<UserPublic> {
  const r = await fetch(`${getApiBase()}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<UserPublic>;
}

export async function authLogin(body: {
  username: string;
  password: string;
}): Promise<{ access_token: string; token_type: string }> {
  const r = await fetch(`${getApiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<{ access_token: string; token_type: string }>;
}

export async function authMe(): Promise<UserPublic> {
  const r = await fetch(`${getApiBase()}/api/v1/auth/me`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<UserPublic>;
}

export function authLogout(): void {
  clearAccessToken();
}

export async function listMyBuilds(): Promise<BuildOut[]> {
  const r = await fetch(`${getApiBase()}/api/v1/builds`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<BuildOut[]>;
}

export async function createBuild(body: BuildCreatePayload): Promise<BuildOut> {
  const r = await fetch(`${getApiBase()}/api/v1/builds`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<BuildOut>;
}

/** Lecture publique : pas d’Authorization (builds `is_public` accessibles sans compte). */
export async function getBuildById(buildId: string): Promise<BuildOut> {
  const r = await fetch(`${getApiBase()}/api/v1/builds/${buildId}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<BuildOut>;
}

export async function deleteBuild(buildId: string): Promise<void> {
  const r = await fetch(`${getApiBase()}/api/v1/builds/${buildId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await parseError(r));
}

export async function fetchItem(ankamaId: number): Promise<ItemOut> {
  const r = await fetch(`${getApiBase()}/api/v1/items/${ankamaId}`, {
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Item ${ankamaId}: ${r.status}`);
  }
  return r.json() as Promise<ItemOut>;
}

export async function fetchItemSet(ankamaId: number): Promise<ItemSetOut> {
  const r = await fetch(`${getApiBase()}/api/v1/sets/${ankamaId}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Panoplie ${ankamaId}: ${r.status}`);
  return r.json() as Promise<ItemSetOut>;
}

export type ItemSearchParams = {
  q?: string;
  page?: number;
  page_size?: number;
  min_level?: number;
  max_level?: number;
  type_name_id?: string;
  is_weapon?: boolean;
  parent_set_id?: number;
  stat_key?: string;
  min_stat_value?: number;
};

export async function searchItems(
  params: ItemSearchParams,
): Promise<ItemListResponse> {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.page_size != null) sp.set("page_size", String(params.page_size));
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.min_level != null) sp.set("min_level", String(params.min_level));
  if (params.max_level != null) sp.set("max_level", String(params.max_level));
  if (params.type_name_id) sp.set("type_name_id", params.type_name_id);
  if (params.is_weapon === true) sp.set("is_weapon", "true");
  if (params.is_weapon === false) sp.set("is_weapon", "false");
  if (params.parent_set_id != null)
    sp.set("parent_set_id", String(params.parent_set_id));
  if (params.stat_key && params.min_stat_value != null) {
    sp.set("stat_key", params.stat_key);
    sp.set("min_stat_value", String(params.min_stat_value));
  }
  const r = await fetch(`${getApiBase()}/api/v1/items?${sp}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<ItemListResponse>;
}

export async function searchSets(
  q: string,
  page = 1,
  page_size = 20,
): Promise<ItemSetListResponse> {
  const sp = new URLSearchParams();
  if (q.trim()) sp.set("q", q.trim());
  sp.set("page", String(page));
  sp.set("page_size", String(page_size));
  const r = await fetch(`${getApiBase()}/api/v1/sets?${sp}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<ItemSetListResponse>;
}

export async function fetchItemsBySet(
  parentSetId: number,
  page_size = 100,
): Promise<ItemOut[]> {
  const res = await searchItems({ parent_set_id: parentSetId, page_size });
  return res.items;
}

export type AggregateResult = {
  total_stats: Record<string, number>;
  active_set_bonuses: string[];
  active_set_details: ActiveSetDetail[];
};

export async function aggregateBuildStats(
  slots: Record<string, number | null>,
  level = 200,
): Promise<AggregateResult> {
  const r = await fetch(`${getApiBase()}/api/v1/stats/aggregate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots, level }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<AggregateResult>;
}

export async function runOptimize(
  body: OptimizationRequest,
): Promise<FullBuild> {
  const r = await fetch(`${getApiBase()}/api/v1/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : JSON.stringify(data?.detail ?? data);
    throw new Error(detail || `Optimize failed (${r.status})`);
  }
  return data as FullBuild;
}
