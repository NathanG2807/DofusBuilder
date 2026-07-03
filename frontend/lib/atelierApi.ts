import { getAccessToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";
import type {
  CraftListCreatePayload,
  CraftListOut,
  CraftListUpdatePayload,
} from "@/types/api";

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

export async function listMyCraftLists(): Promise<CraftListOut[]> {
  const r = await fetch(`${getApiBase()}/api/v1/craft-lists`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<CraftListOut[]>;
}

export async function createCraftList(
  body: CraftListCreatePayload,
): Promise<CraftListOut> {
  const r = await fetch(`${getApiBase()}/api/v1/craft-lists`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<CraftListOut>;
}

export async function updateCraftList(
  id: string,
  body: CraftListUpdatePayload,
): Promise<CraftListOut> {
  const r = await fetch(`${getApiBase()}/api/v1/craft-lists/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json() as Promise<CraftListOut>;
}

export async function deleteCraftList(id: string): Promise<void> {
  const r = await fetch(`${getApiBase()}/api/v1/craft-lists/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await parseError(r));
}

export const GUEST_CRAFT_LISTS_KEY = "zaap_atelier_guest";

export function loadGuestCraftLists(): CraftListOut[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CRAFT_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CraftListOut[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestCraftLists(lists: CraftListOut[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_CRAFT_LISTS_KEY, JSON.stringify(lists));
}

export function clearGuestCraftLists(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CRAFT_LISTS_KEY);
}
