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

  async function request<T>(
    method: string,
    path: string,
    params: Record<string, string | string[]> = {},
    body?: unknown,
  ): Promise<T> {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
      else usp.append(k, v);
    }
    const qs = usp.toString();
    const init: RequestInit = { method, headers: { ...headers } };
    if (body !== undefined) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, init);
    if (!res.ok) throw new HelixError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  function get<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
    return request<T>("GET", path, params);
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

    async getUserChatColor(userId: string): Promise<string | null> {
      const r = await get<{ data: { user_id: string; color: string }[] }>(
        "/chat/color",
        { user_id: userId },
      );
      return r.data[0]?.color || null;
    },

    async getFollowers(broadcasterId: string, moderatorId: string, first = 20): Promise<Follower[]> {
      const r = await get<{ data: Follower[] }>("/channels/followers", {
        broadcaster_id: broadcasterId,
        moderator_id: moderatorId,
        first: String(first),
      });
      return r.data;
    },

    async getAllFollowerIds(broadcasterId: string, moderatorId: string, maxPages = 20): Promise<Set<string>> {
      const ids = new Set<string>();
      let cursor: string | undefined;
      for (let i = 0; i < maxPages; i++) {
        const params: Record<string, string> = {
          broadcaster_id: broadcasterId,
          moderator_id: moderatorId,
          first: "100",
        };
        if (cursor) params.after = cursor;
        const r = await get<{ data: Follower[]; pagination?: { cursor?: string } }>(
          "/channels/followers",
          params,
        );
        for (const f of r.data) ids.add(f.user_id);
        cursor = r.pagination?.cursor;
        if (!cursor || r.data.length === 0) break;
      }
      return ids;
    },

    async checkFollows(broadcasterId: string, moderatorId: string, userId: string): Promise<boolean> {
      const r = await get<{ data: Follower[] }>("/channels/followers", {
        broadcaster_id: broadcasterId,
        moderator_id: moderatorId,
        user_id: userId,
      });
      return r.data.length > 0;
    },

    async deleteChatMessage(
      broadcasterId: string,
      moderatorId: string,
      messageId: string,
    ): Promise<void> {
      await request<void>("DELETE", "/moderation/chat", {
        broadcaster_id: broadcasterId,
        moderator_id: moderatorId,
        message_id: messageId,
      });
    },

    async banUser(
      broadcasterId: string,
      moderatorId: string,
      userId: string,
      opts?: { duration?: number; reason?: string },
    ): Promise<void> {
      const data: { user_id: string; duration?: number; reason?: string } = {
        user_id: userId,
      };
      if (opts?.duration) data.duration = opts.duration;
      if (opts?.reason) data.reason = opts.reason;
      await request<void>(
        "POST",
        "/moderation/bans",
        { broadcaster_id: broadcasterId, moderator_id: moderatorId },
        { data },
      );
    },

    async blockUser(
      targetUserId: string,
      opts?: { sourceContext?: "chat"; reason?: "spam" | "harassment" | "other" },
    ): Promise<void> {
      const params: Record<string, string> = { target_user_id: targetUserId };
      if (opts?.sourceContext) params.source_context = opts.sourceContext;
      if (opts?.reason) params.reason = opts.reason;
      await request<void>("PUT", "/users/blocks", params);
    },
  };
}

export type Helix = ReturnType<typeof helix>;
