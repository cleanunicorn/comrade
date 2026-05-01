export interface SevenTvEmote {
  name: string;
  id: string;
  zeroWidth: boolean;
}

interface RawEmote {
  name: string;
  id: string;
  flags?: number;
  data?: { flags?: number };
}

const FLAG_ZERO_WIDTH = 1 << 0;

function mapEmotes(raw: RawEmote[]): SevenTvEmote[] {
  return raw.map((e) => ({
    name: e.name,
    id: e.id,
    zeroWidth: !!((e.flags ?? 0) & FLAG_ZERO_WIDTH || (e.data?.flags ?? 0) & FLAG_ZERO_WIDTH),
  }));
}

export async function fetch7tvGlobal(): Promise<SevenTvEmote[]> {
  try {
    const res = await fetch("https://7tv.io/v3/emote-sets/global");
    if (!res.ok) return [];
    const json = (await res.json()) as { emotes?: RawEmote[] };
    return mapEmotes(json.emotes ?? []);
  } catch {
    return [];
  }
}

export async function fetch7tvChannel(twitchUserId: string): Promise<SevenTvEmote[]> {
  try {
    const res = await fetch(`https://7tv.io/v3/users/twitch/${twitchUserId}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { emote_set?: { emotes?: RawEmote[] } };
    return mapEmotes(json.emote_set?.emotes ?? []);
  } catch {
    return [];
  }
}

export function emoteUrl(id: string, size: 1 | 2 | 3 | 4 = 2): string {
  return `https://cdn.7tv.app/emote/${id}/${size}x.webp`;
}
