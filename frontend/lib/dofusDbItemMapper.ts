import { fetchItem } from "@/lib/api";
import { fetchDropItem, type DropItemOut } from "@/lib/bestiaryApi";
import type { ItemOut } from "@/types/api";

const DOFUSDB = "https://api.dofusdb.fr";

type EffectMeta = {
  typeName: string;
  category: number;
  isInPercent: boolean;
  hideValueInTooltip: boolean;
};

const effectMetaCache = new Map<number, EffectMeta>();
const effectMetaPending = new Map<number, Promise<EffectMeta>>();

function parseEffectTypeName(descriptionFr: string): string {
  return descriptionFr
    .replace(/#\d+\{\{[^}]*\}\}/g, "")
    .replace(/#\d+/g, "")
    .replace(/^[+#^:\-\s]+/, "")
    .trim();
}

async function fetchEffectMeta(effectId: number): Promise<EffectMeta> {
  const cached = effectMetaCache.get(effectId);
  if (cached) return cached;

  const pending = effectMetaPending.get(effectId);
  if (pending) return pending;

  const promise = fetch(`${DOFUSDB}/effects/${effectId}?lang=fr`, { cache: "force-cache" })
    .then(async (r) => {
      if (!r.ok) throw new Error();
      const d = await r.json() as {
        description?: { fr?: string };
        category?: number;
        isInPercent?: boolean;
        hideValueInTooltip?: boolean;
      };
      const typeName = parseEffectTypeName(d.description?.fr ?? "") || `Effet #${effectId}`;
      return {
        typeName,
        category: d.category ?? 0,
        isInPercent: d.isInPercent ?? false,
        hideValueInTooltip: d.hideValueInTooltip ?? false,
      };
    })
    .catch(() => ({
      typeName: `Effet #${effectId}`,
      category: 0,
      isInPercent: false,
      hideValueInTooltip: false,
    }))
    .then((meta) => {
      effectMetaCache.set(effectId, meta);
      effectMetaPending.delete(effectId);
      return meta;
    });

  effectMetaPending.set(effectId, promise);
  return promise;
}

function buildFormatted(min: number, max: number, typeName: string, isPercent: boolean): string {
  const pctSuffix = isPercent && !typeName.includes("%") ? "%" : "";
  if (max > min) return `${min} à ${max}${pctSuffix} ${typeName}`.trim();
  return `${min}${pctSuffix} ${typeName}`.trim();
}

function isWeaponItem(item: DropItemOut): boolean {
  if (item.className === "WeaponData") return true;
  return item.type?.superType?.name?.fr === "Arme";
}

function effectCategory(item: DropItemOut, effectId: number, index: number): number {
  const fromList = item.effects?.[index]?.category;
  if (fromList != null) return fromList;
  const match = item.effects?.find((e) => e.effectId === effectId);
  return match?.category ?? 0;
}

export async function dofusDbItemToItemOut(item: DropItemOut): Promise<ItemOut> {
  const isWeapon = isWeaponItem(item);
  const visible = (item.possibleEffects ?? []).filter((e) => e.visibleInTooltip !== false);

  const effectIds = [...new Set(visible.map((e) => e.effectId))];
  await Promise.all(effectIds.map((id) => fetchEffectMeta(id)));

  const effects: Record<string, unknown>[] = [];
  for (let i = 0; i < visible.length; i++) {
    const pe = visible[i]!;
    const meta = effectMetaCache.get(pe.effectId)!;
    const min = pe.diceNum || pe.value || 0;
    const max = pe.diceSide > min ? pe.diceSide : min;
    const category = effectCategory(item, pe.effectId, i);
    const isActive = isWeapon && category === 2;

    effects.push({
      int_minimum: min,
      int_maximum: max,
      formatted: meta.hideValueInTooltip
        ? meta.typeName
        : buildFormatted(min, max, meta.typeName, meta.isInPercent),
      type: {
        id: pe.effectId,
        name: meta.typeName,
        is_active: isActive,
        is_meta: false,
      },
      ignore_int_min: meta.hideValueInTooltip,
      ignore_int_max: meta.hideValueInTooltip,
    });
  }

  const weaponDetail = isWeapon && item.apCost != null
    ? {
        ap_cost: item.apCost,
        range: item.minRange != null && item.range != null
          ? { min: item.minRange, max: item.range }
          : undefined,
        critical_hit_probability: item.criticalHitProbability,
        critical_hit_bonus: item.criticalHitBonus,
        max_cast_per_turn: item.maxCastPerTurn,
        cast_in_line: item.castInLine,
        cast_in_diagonal: item.castInDiagonal,
        cast_test_los: item.castTestLos,
      }
    : null;

  return {
    ankama_id: item.id,
    name: item.name.fr,
    level: item.level ?? 1,
    type_name_id: item.type?.name?.fr ?? null,
    is_weapon: isWeapon,
    image_url_icon: item.img,
    effects: item.hideEffects ? [] : effects,
    conditions: item.criterions?.trim() ? item.criterions : null,
    parent_set_id: item.itemSetId != null && item.itemSetId > 0 ? item.itemSetId : null,
    pods: item.realWeight ?? null,
    base_stats: null,
    description: item.description?.fr ?? null,
    weapon_detail: weaponDetail,
  };
}

/** Item pour tooltip butin : backend si disponible, sinon conversion DofusDB. */
export async function resolveDropItemForHover(
  objectId: number,
  cached?: DropItemOut | null,
): Promise<ItemOut | null> {
  try {
    return await fetchItem(objectId);
  } catch {
    const raw = cached ?? await fetchDropItem(objectId);
    if (!raw) return null;
    return dofusDbItemToItemOut(raw);
  }
}
