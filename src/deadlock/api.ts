const BASE = "https://api.deadlock-api.com";
const ASSETS = "https://assets.deadlock-api.com";

export interface ActivePlayer {
  account_id: number;
  team: 0 | 1;
  team_parsed: string;
  abandoned: boolean | null;
  hero_id: number;
}

export interface ActiveMatch {
  match_id: number;
  start_time: string;
  duration_s: number;
  net_worth_team_0: number;
  net_worth_team_1: number;
  match_score: string | number | null;
  objectives_mask_team0: number;
  objectives_mask_team1: number;
  game_mode_parsed: string;
  match_mode_parsed: string;
  region_mode_parsed: string;
  spectators: number;
  open_spectator_slots: number;
  players: ActivePlayer[];
}

export interface HeroInfo {
  id: number;
  name: string;
  className: string;
  iconSmall: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deadlock API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function getActiveMatch(accountId: string): Promise<ActiveMatch | null> {
  if (!accountId) return null;
  const arr = await getJson<ActiveMatch[]>(
    `${BASE}/v1/matches/active?account_ids=${encodeURIComponent(accountId)}`,
  );
  return arr[0] ?? null;
}

interface RawHero {
  id: number;
  name: string;
  class_name: string;
  player_selectable: boolean;
  disabled: boolean;
  images?: { icon_image_small_webp?: string; icon_image_small?: string };
}

const HEROES_KEY = "comrade.deadlock.heroes.v1";
const HEROES_TTL_MS = 24 * 60 * 60 * 1000;
let heroesPromise: Promise<Record<number, HeroInfo>> | null = null;

export function getHeroes(): Promise<Record<number, HeroInfo>> {
  if (heroesPromise) return heroesPromise;

  heroesPromise = (async () => {
    try {
      const cached = localStorage.getItem(HEROES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { ts: number; heroes: Record<number, HeroInfo> };
        if (Date.now() - parsed.ts < HEROES_TTL_MS) return parsed.heroes;
      }
    } catch {
      /* ignore */
    }

    const list = await getJson<RawHero[]>(`${ASSETS}/v2/heroes`);
    const map: Record<number, HeroInfo> = {};
    for (const h of list) {
      map[h.id] = {
        id: h.id,
        name: h.name,
        className: h.class_name,
        iconSmall: h.images?.icon_image_small_webp ?? h.images?.icon_image_small ?? "",
      };
    }
    try {
      localStorage.setItem(HEROES_KEY, JSON.stringify({ ts: Date.now(), heroes: map }));
    } catch {
      /* quota — ignore */
    }
    return map;
  })();

  return heroesPromise;
}
