/** Aligné sur `app/schemas.py` (backend). */

export type ItemEffectLine = {
  formatted?: string;
  type?: { name?: string; id?: number };
};

export type WeaponDetailOut = {
  ap_cost?: number;
  range?: { min?: number; max?: number };
  critical_hit_probability?: number;
  critical_hit_bonus?: number;
  max_cast_per_turn?: number;
  cast_in_line?: boolean;
  cast_in_diagonal?: boolean;
  cast_test_los?: boolean;
};

export type RecipeLine = {
  item_ankama_id: number;
  quantity: number;
  item_subtype?: string;
};

export type ItemOut = {
  ankama_id: number;
  name: string;
  level: number;
  type_name_id: string | null;
  is_weapon: boolean;
  image_url_icon: string | null;
  effects?: ItemEffectLine[] | null;
  conditions?: unknown;
  parent_set_id?: number | null;
  pods?: number | null;
  base_stats: Record<string, number> | null;
  description?: string | null;
  /** Métadonnées de combat arme (coup en PA, portée, CC, coups/tour…) — après migration + ETL. */
  weapon_detail?: WeaponDetailOut | null;
  recipe?: RecipeLine[] | null;
};

export type ItemSetOut = {
  ankama_id: number;
  name: string | null;
  equipment_ids: number[] | null;
  bonus_effects: Record<string, unknown> | null;
};

export type ItemSetListResponse = {
  sets: ItemSetOut[];
  total: number;
  page: number;
  page_size: number;
};

export type ItemListResponse = {
  items: ItemOut[];
  total: number;
  page: number;
  page_size: number;
};

export type ActiveSetDetail = {
  name: string;
  set_id: number;
  piece_count: number;
  total_pieces: number;
  effects: string[];
};

export type FullBuild = {
  slots: Record<string, number | null>;
  total_stats: Record<string, number>;
  active_set_bonuses: string[];
  active_set_details?: ActiveSetDetail[];
  exo_pa?: boolean;
  exo_pm?: boolean;
};

export type OptimizationRequest = {
  level: number;
  class_id: number;
  elements: string[];
  min_pa: number;
  min_pm: number;
  focus_stats: string[];
  allow_exo_pa?: boolean;
  allow_exo_pm?: boolean;
  allow_dofus?: boolean;
  allow_prysmaradite?: boolean;
  mode: "solver" | "genetic";
  /** Poids personnalisés par stat (1-10). Si absent = poids par défaut du solver. */
  stat_weights?: Record<string, number>;
  /** Slots verrouillés : emplacement → ankama_id. Ces items seront conservés dans le build optimisé. */
  locked_slots?: Record<string, number>;
};

/** Aligné sur `BuildOut` (backend). */
export type BuildOut = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  class_id: number | null;
  level: number | null;
  sex: string | null;
  slots: Record<string, number | null> | null;
  total_stats: Record<string, number> | null;
  active_set_bonuses: string[] | null;
  char_stats: Record<string, number> | null;
  parcho_stats: Record<string, number> | null;
  exo_fm: Record<string, string> | null;
  locked_slots: Record<string, number> | null;
  is_public: boolean;
  tags: string[] | null;
  slots_preview: Record<string, string | null> | null;
  username?: string | null;
  upvote_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Lightweight public build (no private stats) for the Stuffs catalog. */
export type PublicBuildOut = {
  id: string;
  name: string;
  class_id: number | null;
  level: number | null;
  sex: string | null;
  is_public: boolean;
  tags: string[] | null;
  slots_preview: Record<string, string | null> | null;
  slots?: Record<string, number | null> | null;
  exo_fm?: Record<string, string> | null;
  username?: string | null;
  upvote_count?: number;
  user_has_upvoted?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UpvoteResponse = {
  upvote_count: number;
  user_has_upvoted: boolean;
};

export type BuildCreatePayload = {
  name: string;
  description?: string | null;
  class_id?: number | null;
  level?: number | null;
  sex?: string | null;
  slots?: Record<string, number | null> | null;
  total_stats?: Record<string, number> | null;
  active_set_bonuses?: string[] | null;
  char_stats?: Record<string, number> | null;
  parcho_stats?: Record<string, number> | null;
  exo_fm?: Record<string, string> | null;
  locked_slots?: Record<string, number> | null;
  is_public?: boolean;
  tags?: string[] | null;
  slots_preview?: Record<string, string | null> | null;
};

export type BuildUpdatePayload = {
  name?: string;
  description?: string | null;
  class_id?: number | null;
  level?: number | null;
  sex?: string | null;
  slots?: Record<string, number | null> | null;
  total_stats?: Record<string, number> | null;
  active_set_bonuses?: string[] | null;
  char_stats?: Record<string, number> | null;
  parcho_stats?: Record<string, number> | null;
  exo_fm?: Record<string, string> | null;
  locked_slots?: Record<string, number> | null;
  is_public?: boolean;
  tags?: string[] | null;
  slots_preview?: Record<string, string | null> | null;
};

export type UserPublic = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  total_upvotes?: number;
};

export type UserProfilePublic = {
  username: string;
  created_at: string;
  public_builds_count: number;
  total_upvotes?: number;
  builds: PublicBuildOut[];
};

export type CraftEntryType = "item" | "set" | "build";

export type CraftEntry = {
  id: string;
  entry_type: CraftEntryType;
  ref_id: string;
  quantity: number;
  label?: string | null;
  slots?: Record<string, number | null> | null;
};

export type IngredientProgress = {
  owned: number;
  validated: number;
};

export type CraftListOut = {
  id: string;
  name: string;
  entries: CraftEntry[];
  progress: Record<string, IngredientProgress>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CraftListCreatePayload = {
  name: string;
  entries?: CraftEntry[];
  progress?: Record<string, IngredientProgress>;
};

export type CraftListUpdatePayload = {
  name?: string;
  entries?: CraftEntry[];
  progress?: Record<string, IngredientProgress>;
};

export type CommunityStats = {
  members: number;
  online_users: number;
  builds_total: number;
  builds_public: number;
  craft_lists: number;
  items: number;
  item_sets: number;
  game_data: DofusduGameMeta | null;
};

export type DofusduGameMeta = {
  game_version: string;
  data_updated_at: string | null;
};
