Render frontend deploy checklist

Required environment variables

Set these in the Render dashboard for the frontend service:

```env
VITE_API_BASE_URL=https://qring-backend-1.onrender.com/api/v1
VITE_SOCKET_URL=https://qring-backend-1.onrender.com
VITE_PUBLIC_APP_URL=https://www.useqring.online
VITE_SOCKET_PATH=/socket.io
VITE_DASHBOARD_NAMESPACE=/realtime/dashboard
VITE_SIGNALING_NAMESPACE=/realtime/signaling
VITE_LIVEKIT_URL=wss://livekit.useqring.online
VITE_WEBRTC_ICE_SERVERS=[{"urls":["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]},{"urls":["turn:turn.useqring.online:3478?transport=udp"],"username":"TURN_USERNAME","credential":"TURN_PASSWORD"},{"urls":["turns:turn.useqring.online:443?transport=tcp"],"username":"TURN_USERNAME","credential":"TURN_PASSWORD"}]
VITE_CALL_CONNECT_TIMEOUT_MS=8000
VITE_CALL_RING_TIMEOUT_MS=30000
VITE_PREFER_VOICE_NOTE_FALLBACK=true
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=qring-7ced9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qring-7ced9
VITE_FIREBASE_APP_ID=1:103048317220:web:72f9667db6daae62504bb1
VITE_FIREBASE_VAPID_KEY=YOUR_FIREBASE_VAPID_KEY
```

Notes

- Do not wrap `VITE_WEBRTC_ICE_SERVERS` in outer single quotes on Render.
- Replace `TURN_USERNAME` and `TURN_PASSWORD` with real TURN credentials.
- Add any extra Firebase values your deployment needs, such as `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, or `VITE_FIREBASE_MEASUREMENT_ID`.

Recommended Render settings

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22.12.0`

What to do after setting env vars

1. Save the environment variables in Render.
2. Trigger a manual redeploy.
3. If the build still fails, copy the log lines after `npm run build`.
