import type { TwitchUser } from "../auth/twitchAuth";

export interface Stream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tags: string[];
}

export interface Chatter {
  user_id: string;
  user_login: string;
  user_name: string;
}

export interface Follower {
  user_id: string;
  user_login: string;
  user_name: string;
  followed_at: string;
}

const BASE = "https://api.twitch.tv/helix";

class HelixError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Helix ${status}: ${body}`);
    this.status = status;
  }
}

export function helix(accessToken: string, clientId: string) {
  const headers = {
    "Client-Id": clientId,
    Authorization: `Bearer ${accessToken}`,
  };

  async function get<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
      else usp.append(k, v);
    }
    const qs = usp.toString();
    const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, { headers });
    if (!res.ok) throw new HelixError(res.status, await res.text());
    return res.json() as Promise<T>;
  }

  return {
    async getUsers(ids: string[]): Promise<TwitchUser[]> {
      if (!ids.length) return [];
      const r = await get<{ data: TwitchUser[] }>("/users", { id: ids });
      return r.data;
    },

    async getStream(userId: string): Promise<Stream | null> {
      const r = await get<{ data: Stream[] }>("/streams", { user_id: userId });
      return r.data[0] ?? null;
    },

    async getChatters(broadcasterId: string, moderatorId: string): Promise<{ chatters: Chatter[]; total: number }> {
      const r = await get<{ data: Chatter[]; total: number }>("/chat/chatters", {
        broadcaster_id: broadcasterId,
        moderator_id: moderatorId,
        first: "1000",
      });
      return { chatters: r.data, total: r.total };
    },

    async getFollowers(broadcasterId: string, moderatorId: string, first = 20): Promise<Follower[]> {
      const r = await get<{ data: Follower[] }>("/channels/followers", {
        broadcaster_id: broadcasterId,
        moderator_id: moderatorId,
        first: String(first),
      });
      return r.data;
    },
  };
}

export type Helix = ReturnType<typeof helix>;
