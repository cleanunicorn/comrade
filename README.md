# Comrade

Browser-based Twitch streaming companion. Helps keep your audience engaged using your camera, mic, and live Twitch data (chat, viewers, stream info).

All credentials, OAuth tokens, and settings live **only in your browser's localStorage**. There is no backend — `vite` just serves static files.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- `tmi.js` for Twitch IRC chat
- Twitch Helix REST for stream/viewer data
- `getUserMedia` for camera + mic

## Setup

1. **Create a Twitch app**
   - Go to https://dev.twitch.tv/console/apps and click *Register Your Application*.
   - **OAuth Redirect URLs:** `http://localhost:5173/`
   - **Category:** Application Integration
   - **Client Type:** Public
   - Copy the **Client ID** (you do *not* need the secret — implicit flow)

2. **Install + run**

   ```sh
   yarn install
   yarn dev
   ```

3. **First launch**
   - Open http://localhost:5173/
   - Paste the Client ID into the Settings screen
   - Click *Connect Twitch*, authorize on Twitch, you're back in

## Where things live

```
src/
  auth/             Twitch OAuth (implicit flow), token in localStorage
  twitch/           Helix REST client, chat (tmi.js) hook, stream info hook
  media/            getUserMedia camera + mic + audio level
  settings/         localStorage-backed settings (client ID, redirect URI)
  components/       UI (Login, Settings, Dashboard, CamPanel, ChatPanel, StreamStats)
```

## Scopes requested

`user:read:email chat:read chat:edit channel:read:subscriptions moderator:read:followers moderator:read:chatters channel:read:redemptions bits:read`
