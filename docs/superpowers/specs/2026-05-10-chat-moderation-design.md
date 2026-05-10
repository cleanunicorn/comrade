# Chat Moderation: Delete, Timeout, Ban, Block

**Status:** Approved
**Date:** 2026-05-10
**Branch:** feat/manage-messages-chat

## Goal

Add moderator/broadcaster-facing actions in the chat panel:

- Delete a single message
- Timeout a user (with duration presets)
- Permanently ban a user
- Block a user globally on Twitch

All actions go through Twitch Helix endpoints. UI gates by `canModerate` (broadcaster or mod in current channel).

## Scope

In scope:

- New OAuth scopes + forced re-auth when missing
- Three new Helix methods (DELETE/POST/PUT)
- New actions on `useChat()`: `deleteMessage`, `banUser`, `blockUser`, plus state sets
- Hover-row icon UI in `ChatPanel` with confirm popovers for ban/block
- Local filtering of deleted/banned/blocked messages
- Cross-session persistence of personal blocks

Out of scope:

- Unban / unblock UI
- Bulk delete / multi-select
- Mod action history panel
- Auto-mod / regex filters

## Architecture

### 1. OAuth scopes

Append to `TWITCH_SCOPES` in `src/auth/twitchAuth.ts`:

- `moderator:manage:chat_messages`
- `moderator:manage:banned_users`
- `user:manage:blocked_users`

On app boot, compare `token.scopes` with required set. If missing any scope, clear token and redirect to login. Show one-time toast "New permissions needed for moderation."

### 2. Helix client (`src/twitch/helix.ts`)

Refactor `get<T>` into a private `request<T>(method, path, params, body?)` helper. `get` calls `request("GET", ...)`. New methods:

```ts
async deleteChatMessage(broadcasterId: string, moderatorId: string, messageId: string): Promise<void>
// DELETE /moderation/chat?broadcaster_id&moderator_id&message_id
// 204 on success

async banUser(
  broadcasterId: string,
  moderatorId: string,
  userId: string,
  opts?: { duration?: number; reason?: string },
): Promise<void>
// POST /moderation/bans?broadcaster_id&moderator_id
// body: { data: { user_id, duration?, reason? } }
// duration omitted = permanent

async blockUser(
  targetUserId: string,
  opts?: { sourceContext?: "chat"; reason?: "spam" | "harassment" | "other" },
): Promise<void>
// PUT /users/blocks?target_user_id&source_context&reason
```

All throw existing `HelixError` on non-2xx.

### 3. Chat hook (`src/twitch/useChat.ts`)

Extend `ChatMessage`:

```ts
userId: string; // from tags["user-id"]
```

New state:

- `deletedIds: Set<string>` — message ids removed; cleared on channel switch
- `bannedUsers: Set<string>` — lowercase logins; cleared on channel switch
- `blockedUserIds: Set<string>` — twitch user ids; persisted to localStorage `comrade.blocks.<myUserId>`; capped at 5000

New derived value:

- `canModerate: boolean` — true if `(channel ?? user.login).toLowerCase() === user.login.toLowerCase()` OR last `userstate` event for current channel had `mod === true`. Subscribe to tmi `userstate` to track this.

Subscribe to tmi events to mirror remote moderation:

- `messagedeleted` → add msg id to `deletedIds`
- `ban` → add login to `bannedUsers`
- `timeout` → add login to `bannedUsers` (clear on timeout expiry — out of scope to track precisely; row stays hidden until next channel switch)

New actions on `useChat()`:

```ts
deleteMessage(messageId: string): Promise<void>
banUser(userId: string, login: string, durationSec?: number, reason?: string): Promise<void>
blockUser(userId: string, login: string): Promise<void>
```

Each action:

1. Optimistically update local set
2. Call Helix
3. On error: rollback set, set transient error string

### 4. Chat panel (`src/components/ChatPanel.tsx`)

Filter pipeline:

```ts
messages.filter(
  (m) =>
    !deletedIds.has(m.id) &&
    !blockedUserIds.has(m.userId) &&
    !bannedUsers.has(m.username),
);
```

Wrap each row with `group relative flex justify-between`. When `canModerate && m.username !== user.login && !m.isBroadcaster`, render `<ChatMessageActions>`.

### 5. ChatMessageActions component (`src/components/ChatMessageActions.tsx`)

Props:

```ts
{
  message: ChatMessage;
  onDelete: () => void;
  onTimeout: (sec: number) => void;
  onBan: (reason?: string) => void;
  onBlock: () => void;
}
```

Layout: row of 4 icon buttons hidden by default, shown via `group-hover:flex`.

- Trash icon → `onDelete()` immediately
- Clock icon (split) → click = `onTimeout(600)`; chevron opens dropdown `[1m, 10m, 1h, 24h, 7d]`
- Ban icon → opens popover anchored below: "Ban @user permanently?" + optional one-line reason input + `[Cancel] [Confirm]`
- Block icon → opens popover: "Block @user across Twitch?" + `[Cancel] [Confirm]`

Icons: inline SVG, no new dependency.

## Data flow

```
ChatPanel hover msg
   → ChatMessageActions click
      → useChat action (optimistic state update)
         → helix.x() (POST/PUT/DELETE)
            success → keep state
            failure → rollback + set error string
   → ChatPanel filters by deletedIds/bannedUsers/blockedUserIds → re-renders
```

Tmi-side events (`messagedeleted`/`ban`/`timeout`) feed the same sets so external mod actions reflect.

## Error handling

| Error                            | Behavior                                       |
| -------------------------------- | ---------------------------------------------- |
| 401 missing scope                | Toast "Re-login required" + button to logout   |
| 403 mod-on-mod ban               | Toast "Cannot moderate this user"              |
| 404 already deleted              | Silent (id already in `deletedIds`)            |
| 400 already banned               | Toast "Already banned"                         |
| Block already exists (200)       | No-op                                          |
| Network failure                  | Rollback optimistic state, toast error message |
| localStorage quota for blocks    | Cap at 5000; drop oldest                       |

## Testing checklist (manual)

- [ ] Login as broadcaster, own message: no action icons on hover
- [ ] Hover viewer message: 4 icons appear
- [ ] Click trash: row disappears; refresh: still gone (cache filtered)
- [ ] Click clock default: user timed out 10m, rows hidden
- [ ] Click clock chevron → 1h: timeout 1h applied
- [ ] Click ban → confirm: user banned; future messages filtered
- [ ] Click block → confirm: user blocked; reload session: still hidden
- [ ] Login as non-mod in other channel: no icons render
- [ ] Revoke scope on twitch.tv → action fails → re-login prompt shows
- [ ] Switch channel: deletedIds/bannedUsers reset; blockedUserIds persists

## Open questions

None.
