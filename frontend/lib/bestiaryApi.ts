import { fuzzyMatchScore, FUZZY_MIN_SCORE, normalizeSearchText } from "@/lib/fuzzySearch";

const DOFUSDB = "https://api.dofusdb.fr";

/* ── Types ───────────────────────────────────────────────────────────────── */
export type MonsterGrade = {
  grade: number;
  level: number;
  lifePoints: number;
  actionPoints: number;
  movementPoints: number;
  wisdom: number;
  earthResistance: number;
  fireResistance: number;
  waterResistance: number;
  airResistance: number;
  neutralResistance: number;
  strength: number;
  intelligence: number;
  chance: number;
  agility: number;
  gradeXp: number;
  paDodge: number;
  pmDodge: number;
  damageReflect: number;
};

export type MonsterDrop = {
  objectId: number;
  percentDropForGrade1: number;
  percentDropForGrade5: number;
  hasCriterions: boolean;
  disableDropModificator: number | boolean;
  isGlobal?: boolean;
};

export type MonsterBase = {
  id: number;
  gfxId: number;
  name: { fr: string; en?: string; [key: string]: string | undefined };
  img: string;
  grades: MonsterGrade[];
  tags: string[];
  isBoss: boolean;
  isMiniBoss: boolean;
  isQuestMonster: boolean;
  hideInBestiary: boolean;
  correspondingMiniBossId: number;
  race: number;
  subareas: number[];
  spells: number[];
  drops: MonsterDrop[];
};

export type MonsterDetail = MonsterBase & {
  correspondingMiniBoss?: MonsterBase | null;
};

export type MonsterListResponse = {
  total: number;
  limit: number;
  skip: number;
  data: MonsterBase[];
};

export type SpellOut = {
  id: number;
  name: { fr: string };
  description: { fr: string };
  img: string;
};

export type SubareaOut = {
  id: number;
  name: { fr: string };
  level: number;
  areaId?: number;
  dungeonId?: number;
};

export type AreaOut = {
  id: number;
  name: { fr: string };
  subareaIds: number[];
};

export type DungeonOut = {
  id: number;
  name: { fr: string };
  monsters: number[];
  subarea?: number;
  optimalPlayerLevel?: number;
};

export type DungeonCardOut = DungeonOut & {
  boss: MonsterBase | null;
};

export type DungeonLevelRange = "1-50" | "51-100" | "101-150" | "150-190" | "200";

export const DUNGEON_LEVEL_FILTERS: { id: DungeonLevelRange; label: string }[] = [
  { id: "1-50", label: "Niveaux 1 à 50" },
  { id: "51-100", label: "Niveaux 51 à 100" },
  { id: "101-150", label: "Niveaux 101 à 150" },
  { id: "150-190", label: "Niveaux 150 à 190" },
  { id: "200", label: "Niveaux 200" },
];

function dungeonLevel(dungeon: DungeonCardOut): number {
  return dungeon.optimalPlayerLevel ?? 9999;
}

function matchesDungeonLevelRange(level: number, range: DungeonLevelRange): boolean {
  switch (range) {
    case "1-50": return level >= 1 && level <= 50;
    case "51-100": return level >= 51 && level <= 100;
    case "101-150": return level >= 101 && level <= 150;
    case "150-190": return level >= 150 && level <= 190;
    case "200": return level >= 200;
  }
}

function sortDungeonsByLevel(dungeons: DungeonCardOut[]): DungeonCardOut[] {
  return [...dungeons].sort((a, b) => {
    const levelDiff = dungeonLevel(a) - dungeonLevel(b);
    if (levelDiff !== 0) return levelDiff;
    return a.name.fr.localeCompare(b.name.fr, "fr");
  });
}

const DUNGEON_NAME_STOP_WORDS = new Set([
  "donjon", "repaire", "antre", "cour", "centre", "grotte", "salle",
  "bibliotheque", "grange", "domaine", "clos", "labyrinthe", "chambre",
  "de", "du", "des", "la", "le", "les", "d", "l",
]);

/** Choisit le boss « principal » — priorité au nom présent dans le titre du donjon. */
export function pickDungeonBoss(monsters: MonsterBase[], dungeonName: string): MonsterBase | null {
  if (!monsters.length) return null;

  const bosses = monsters.filter((m) => m.isBoss || m.isMiniBoss);
  const pool = bosses.length ? bosses : monsters;
  if (pool.length === 1) return pool[0] ?? null;

  const dungeonNorm = normalizeSearchText(dungeonName);
  let best: MonsterBase | null = null;
  let bestScore = -1;

  for (const monster of pool) {
    const nameNorm = normalizeSearchText(monster.name.fr);
    let score = 0;

    if (dungeonNorm.includes(nameNorm)) {
      score += 100 + nameNorm.length;
    }

    const monsterWords = nameNorm.split(/\s+/).filter((w) => w.length > 2);
    const dungeonWords = dungeonNorm
      .split(/\s+/)
      .filter((w) => w.length > 2 && !DUNGEON_NAME_STOP_WORDS.has(w));

    for (const word of monsterWords) {
      if (dungeonWords.some((dw) => dw.includes(word) || word.includes(dw))) {
        score += 30;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = monster;
    }
  }

  return best ?? pool[pool.length - 1] ?? null;
}

export type ZoneSearchHit =
  | { kind: "area"; id: number; name: string }
  | { kind: "subarea"; id: number; name: string; parentName?: string; level?: number; isDungeon?: boolean };

export type MonsterRaceOut = {
  id: number;
  name: { fr: string };
  monsters?: number[];
};

/** Race DofusDB « Avis de recherche » — liste officielle des mobs recherchés. */
export const WANTED_MONSTER_RACE_ID = 32;

export function isWantedMonster(m: Pick<MonsterBase, "race">): boolean {
  return m.race === WANTED_MONSTER_RACE_ID;
}

function sortMonstersByLevel(monsters: MonsterBase[]): MonsterBase[] {
  return [...monsters].sort((a, b) => {
    const levelA = a.grades[0]?.level ?? 0;
    const levelB = b.grades[0]?.level ?? 0;
    if (levelA !== levelB) return levelA - levelB;
    return a.name.fr.localeCompare(b.name.fr, "fr");
  });
}

export function filterMonstersByName(query: string, monsters: MonsterBase[]): MonsterBase[] {
  const needle = normalizeSearchText(query);
  if (!needle) return monsters;
  return monsters.filter((m) => normalizeSearchText(m.name.fr).includes(needle));
}

export type DropItemEffect = {
  effectId: number;
  effectElement: number;
  value: number;
  diceNum: number;
  diceSide: number;
  duration: number;
  visibleInTooltip: boolean;
};

export type DropItemSimpleEffect = {
  effectId: number;
  category: number;
  from: number;
  to: number;
};

export type DropItemOut = {
  id: number;
  name: { fr: string };
  description?: { fr: string };
  img: string;
  level?: number;
  hideEffects?: boolean;
  className?: string;
  realWeight?: number;
  itemSetId?: number;
  criterions?: string;
  apCost?: number;
  minRange?: number;
  range?: number;
  criticalHitProbability?: number;
  criticalHitBonus?: number;
  maxCastPerTurn?: number;
  castInLine?: boolean;
  castInDiagonal?: boolean;
  castTestLos?: boolean;
  possibleEffects?: DropItemEffect[];
  effects?: DropItemSimpleEffect[];
  type?: {
    name?: { fr: string };
    superType?: { name?: { fr: string } };
  };
};

/** Fetch un item butin depuis DofusDB (endpoint par id). */
export async function fetchDropItem(id: number): Promise<DropItemOut | null> {
  const r = await fetch(`${DOFUSDB}/items/${id}?lang=fr`, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json() as DropItemOut & { id: number };
  return { ...data, id: data.id ?? id };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function fetchDropItems(ids: number[]): Promise<DropItemOut[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];

  const results = await mapWithConcurrency(unique, 4, async (id) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const item = await fetchDropItem(id);
      if (item) return item;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
    return null;
  });

  return results.filter((item): item is DropItemOut => item != null);
}

/** IDs butin à résoudre (tous grades, sans limite artificielle). */
export function collectDropObjectIds(drops: MonsterDrop[]): number[] {
  return [...new Set(
    drops
      .filter((d) => !d.isGlobal && !d.disableDropModificator)
      .filter((d) => {
        const row = d as unknown as Record<string, number>;
        for (let g = 1; g <= 5; g++) {
          if ((row[`percentDropForGrade${g}`] ?? 0) > 0) return true;
        }
        return false;
      })
      .map((d) => d.objectId),
  )];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
export function monsterImgUrl(m: Pick<MonsterBase, "img" | "gfxId">): string {
  return m.img ?? `${DOFUSDB}/img/monsters/${m.gfxId}.png`;
}

/** Fuite du monstre (Chance / 10, arrondi inférieur). */
export function monsterGradeFuite(grade: MonsterGrade): number {
  return Math.floor(grade.chance / 10);
}

/** Tacle du monstre (Agilité / 10, arrondi inférieur). */
export function monsterGradeTacle(grade: MonsterGrade): number {
  return Math.floor(grade.agility / 10);
}

/** Mappe les caractéristiques d'un grade de monstre vers le format de calcul de dégâts. */
export function monsterGradeToCombatStats(grade: MonsterGrade): Record<string, number> {
  return {
    strength: grade.strength,
    intelligence: grade.intelligence,
    chance: grade.chance,
    agility: grade.agility,
    power: 0,
    damage: 0,
    damage_earth: 0,
    damage_fire: 0,
    damage_water: 0,
    damage_air: 0,
    damage_neutral: 0,
    critical_damage: 0,
  };
}

const MONSTER_PAGE_SIZE = 50;

/** Construit une query string avec des paramètres bracket-style sans encoder les crochets. */
function buildQuery(base: Record<string, string>, arrayParams?: Record<string, (number | string)[]>): string {
  const parts = Object.entries(base).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  if (arrayParams) {
    for (const [key, values] of Object.entries(arrayParams)) {
      for (const v of values) {
        parts.push(`${key}[]=${encodeURIComponent(v)}`);
      }
    }
  }
  return parts.join("&");
}

/** Donjons d'expédition (ex. « Expédition - … », « Expédition de l'Audace - … »). */
export function isExpeditionDungeon(name: string): boolean {
  return /^exp[eé]dition\b/i.test(name.trim());
}

async function fetchMonsterPages(filterQuery: string): Promise<MonsterBase[]> {
  const all: MonsterBase[] = [];
  let skip = 0;

  while (true) {
    const qs = `${filterQuery}&$limit=${MONSTER_PAGE_SIZE}&$skip=${skip}`;
    const r = await fetch(`${DOFUSDB}/monsters?${qs}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const page = await r.json() as MonsterListResponse;
    all.push(...page.data);
    if (all.length >= page.total || page.data.length === 0) break;
    skip += page.data.length;
  }

  return all;
}

/* ── API calls ───────────────────────────────────────────────────────────── */
export async function searchMonsters(params: { q?: string }): Promise<MonsterListResponse> {
  const parts: string[] = ["lang=fr"];
  if (params.q?.trim()) {
    parts.push(`slug.fr[$regex]=${encodeURIComponent(params.q.trim())}`);
  }
  const r = await fetch(`${DOFUSDB}/monsters?${parts.join("&")}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<MonsterListResponse>;
}

export async function fetchAllArchimonsters(): Promise<MonsterBase[]> {
  const filter = buildQuery({ lang: "fr", isMiniBoss: "true" });
  const monsters = await fetchMonsterPages(filter);
  return sortMonstersByLevel(monsters.filter((m) => !m.hideInBestiary));
}

/** @deprecated Préférer filterMonstersByName */
export function filterArchimonsters(query: string, monsters: MonsterBase[]): MonsterBase[] {
  return filterMonstersByName(query, monsters);
}

export async function fetchMonsterRaceById(id: number): Promise<MonsterRaceOut | null> {
  const qs = buildQuery({ lang: "fr" }, { id: [id] });
  const r = await fetch(`${DOFUSDB}/monster-races?${qs}`, { cache: "force-cache" });
  if (!r.ok) return null;
  const data = await r.json() as { data: MonsterRaceOut[] };
  return data.data?.[0] ?? null;
}

export async function fetchAllWantedMonsters(): Promise<MonsterBase[]> {
  const race = await fetchMonsterRaceById(WANTED_MONSTER_RACE_ID);
  const ids = race?.monsters ?? [];
  if (!ids.length) return [];
  const monsters = await fetchMonstersByIds(ids);
  return sortMonstersByLevel(monsters.filter((m) => !m.hideInBestiary));
}

export function filterWantedMonsters(query: string, monsters: MonsterBase[]): MonsterBase[] {
  return filterMonstersByName(query, monsters);
}

export async function fetchAreas(): Promise<AreaOut[]> {
  const r = await fetch(`${DOFUSDB}/areas?lang=fr&$limit=100`, { cache: "force-cache" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { data: AreaOut[] };
  return data.data ?? [];
}

export async function fetchAllSubareas(): Promise<SubareaOut[]> {
  const r = await fetch(`${DOFUSDB}/subareas?lang=fr&$limit=600`, { cache: "force-cache" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { data: SubareaOut[] };
  return data.data ?? [];
}

export function searchZones(
  query: string,
  areas: AreaOut[],
  subareas: SubareaOut[],
  limit = 15,
): ZoneSearchHit[] {
  if (normalizeSearchText(query).length < 2) return [];

  const areaNameById = new Map(areas.map((area) => [area.id, area.name.fr]));
  const scored: Array<ZoneSearchHit & { score: number }> = [];

  for (const area of areas) {
    const score = fuzzyMatchScore(query, area.name.fr);
    if (score >= FUZZY_MIN_SCORE) {
      scored.push({ kind: "area", id: area.id, name: area.name.fr, score });
    }
  }

  for (const subarea of subareas) {
    const parentName = areaNameById.get(subarea.areaId ?? -1);
    const searchLabel = parentName
      ? `${subarea.name.fr} ${parentName}`
      : subarea.name.fr;
    const score = fuzzyMatchScore(query, searchLabel);
    if (score >= FUZZY_MIN_SCORE) {
      scored.push({
        kind: "subarea",
        id: subarea.id,
        name: subarea.name.fr,
        parentName,
        level: subarea.level,
        isDungeon: (subarea.dungeonId ?? 0) > 0,
        score,
      });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.kind !== b.kind) return a.kind === "area" ? -1 : 1;
      return a.name.localeCompare(b.name, "fr");
    })
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit);
}

export async function searchDungeons(query: string, limit = 15): Promise<DungeonOut[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const parts = [
    "lang=fr",
    `$limit=${limit}`,
    `slug.fr[$regex]=${encodeURIComponent(q)}`,
  ];
  const r = await fetch(`${DOFUSDB}/dungeons?${parts.join("&")}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { data: DungeonOut[] };
  return (data.data ?? []).filter((dungeon) => !isExpeditionDungeon(dungeon.name.fr));
}

const DUNGEON_PAGE_SIZE = 50;

export async function fetchAllDungeons(): Promise<DungeonOut[]> {
  const all: DungeonOut[] = [];
  let skip = 0;

  while (true) {
    const r = await fetch(
      `${DOFUSDB}/dungeons?lang=fr&$limit=${DUNGEON_PAGE_SIZE}&$skip=${skip}`,
      { cache: "force-cache" },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const page = await r.json() as { total: number; data: DungeonOut[] };
    all.push(...page.data);
    if (all.length >= page.total || page.data.length === 0) break;
    skip += page.data.length;
  }

  return all.filter((dungeon) => !isExpeditionDungeon(dungeon.name.fr));
}

export async function enrichDungeonsWithBosses(dungeons: DungeonOut[]): Promise<DungeonCardOut[]> {
  if (!dungeons.length) return [];

  const monsterIds = [...new Set(dungeons.flatMap((dungeon) => dungeon.monsters ?? []))];
  const monsters = await fetchMonstersByIds(monsterIds);
  const monsterById = new Map(monsters.map((monster) => [monster.id, monster]));

  return dungeons.map((dungeon) => {
    const dungeonMonsters = (dungeon.monsters ?? [])
      .map((id) => monsterById.get(id))
      .filter((monster): monster is MonsterBase => monster != null);
    return {
      ...dungeon,
      boss: pickDungeonBoss(dungeonMonsters, dungeon.name.fr),
    };
  });
}

export function filterDungeons(
  query: string,
  dungeons: DungeonCardOut[],
  levelRange?: DungeonLevelRange | null,
): DungeonCardOut[] {
  let result = dungeons;

  if (levelRange) {
    result = result.filter((dungeon) =>
      matchesDungeonLevelRange(dungeonLevel(dungeon), levelRange),
    );
  }

  const needle = normalizeSearchText(query);
  if (needle) {
    result = result.filter((dungeon) => normalizeSearchText(dungeon.name.fr).includes(needle));
  }

  return sortDungeonsByLevel(result);
}

export async function fetchMonstersBySubareas(subareaIds: number[]): Promise<MonsterBase[]> {
  if (!subareaIds.length) return [];
  const filter = buildQuery({ lang: "fr" }, { "subareas[$in]": subareaIds });
  return fetchMonsterPages(filter);
}

export async function fetchMonstersByIds(ids: number[]): Promise<MonsterBase[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const filter = buildQuery({ lang: "fr" }, { id: unique });
  return fetchMonsterPages(filter);
}

export async function fetchMonster(id: number): Promise<MonsterDetail> {
  const r = await fetch(`${DOFUSDB}/monsters/${id}?lang=fr`, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<MonsterDetail>;
}

export async function fetchSpells(ids: number[]): Promise<SpellOut[]> {
  if (!ids.length) return [];
  const qs = buildQuery({ lang: "fr" }, { id: ids });
  const r = await fetch(`${DOFUSDB}/spells?${qs}`, { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json() as { data: SpellOut[] };
  return data.data ?? [];
}

export async function fetchSubareas(ids: number[]): Promise<SubareaOut[]> {
  if (!ids.length) return [];
  const qs = buildQuery({ lang: "fr" }, { id: ids });
  const r = await fetch(`${DOFUSDB}/subareas?${qs}`, { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json() as { data: SubareaOut[] };
  return data.data ?? [];
}

export async function fetchMonsterRace(id: number): Promise<MonsterRaceOut | null> {
  const qs = buildQuery({ lang: "fr" }, { id: [id] });
  const r = await fetch(`${DOFUSDB}/monster-races?${qs}`, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json() as { data: MonsterRaceOut[] };
  return data.data?.[0] ?? null;
}
