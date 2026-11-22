export type TrophyCounts = { bronze: number; silver: number; gold: number; platinum: number };

export type GameRow = {
  id: number;
  title: string;
  platform: string;
  format: "fisico" | "digital";
  edition: string | null;
  status: Status;
  owned: number;
  user_rating: number | null;
  notes: string | null;
  price_paid: number | null;
  purchase_date: string | null;
  market_value: number | null;
  target_price: number | null;

  igdb_id: number | null;
  igdb_slug: string | null;
  cover_url: string | null;
  summary: string | null;
  genres: string | null;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  igdb_rating: number | null;
  critic_rating: number | null;
  screenshots: string | null;
  ttb_main: number | null;
  ttb_extra: number | null;
  ttb_complete: number | null;
  metadata_at: string | null;

  psn_np_id: string | null;
  psn_service: string | null;
  psn_title_ids: string | null;
  psn_icon: string | null;
  psn_progress: number | null;
  psn_earned: string | null;
  psn_defined: string | null;
  psn_updated_at: string | null;
  psn_details_at: string | null;

  xbox_title_id: string | null;
  xbox_icon: string | null;
  xbox_progress: number | null;
  xbox_ach_earned: number | null;
  xbox_ach_total: number | null;
  xbox_gs_earned: number | null;
  xbox_gs_total: number | null;
  xbox_details_at: string | null;
  xbox_details_count: number | null;

  playtime_minutes: number | null;
  first_played: string | null;
  last_played: string | null;

  created_at: string;
  updated_at: string;
};

export type AchievementRow = {
  id: number;
  game_id: number;
  source: "psn" | "xbox";
  ext_id: string;
  name: string | null;
  description: string | null;
  name_en: string | null;
  description_en: string | null;
  icon_url: string | null;
  type: string | null;
  points: number | null;
  rarity: number | null;
  hidden: number;
  earned: number;
  earned_at: string | null;
};

export const STATUSES = ["backlog", "jogando", "zerado", "platinado", "abandonado", "desejado"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  jogando: "Jogando",
  zerado: "Zerado",
  platinado: "Platinado / 100%",
  abandonado: "Abandonado",
  desejado: "Lista de desejos",
};

export const PLATFORMS = [
  "PS5",
  "PS4",
  "PS3",
  "PS Vita",
  "Xbox Series",
  "Xbox One",
  "Xbox 360",
  "Switch 2",
  "Switch",
  "Nintendo",
  "PC",
  "Outro",
] as const;
