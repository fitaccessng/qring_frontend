Render frontend deploy checklist

Backend prerequisites

- The backend `REDIS_URL` must be the exact internal Key Value URL copied from the Render dashboard `Connect` menu for your Key Value instance.
- Do not guess this value and do not use placeholder hosts like `redis.internal:6379` unless Render explicitly shows that exact hostname for your instance.
- Your backend service and the Key Value instance must be in the same Render workspace and region.
- If `REDIS_URL` is wrong or points to an unreachable host, login can fail with a backend `500`, and the browser may misleadingly show it as a CORS error.

Required environment variables

Set these in the Render dashboard for the frontend service:

```env
VITE_API_BASE_URL=https://qring-backend-1.onrender.com/api/v1
VITE_SOCKET_URL=https://qring-backend-1.onrender.com
VITE_PUBLIC_APP_URL=https://www.useqring.online
VITE_SOCKET_PATH=/socket.io
VITE_DASHBOARD_NAMESPACE=/realtime/dashboard
VITE_SIGNALING_NAMESPACE=/realtime/signaling
VITE_LIVEKIT_CLOUD=true
VITE_LIVEKIT_URL=wss://qring-yovnizqn.livekit.cloud
VITE_CALL_CONNECT_TIMEOUT_MS=8000
VITE_CALL_RING_TIMEOUT_MS=30000
VITE_PREFER_VOICE_NOTE_FALLBACK=true
VITE_RTC_MONITORING_URL=https://YOUR_BACKEND_OR_MONITORING_ENDPOINT/rtc
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=qring-7ced9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qring-7ced9
VITE_FIREBASE_APP_ID=1:103048317220:web:72f9667db6daae62504bb1
VITE_FIREBASE_VAPID_KEY=YOUR_FIREBASE_VAPID_KEY
```

Notes

- For LiveKit Cloud, leave `VITE_WEBRTC_ICE_SERVERS` unset unless LiveKit support specifically instructs otherwise.
- `VITE_LIVEKIT_URL` must remain `wss://qring-yovnizqn.livekit.cloud` unless the LiveKit Cloud project changes.
- Add any extra Firebase values your deployment needs, such as `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, or `VITE_FIREBASE_MEASUREMENT_ID`.

Recommended Render settings

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22.12.0`
- Rewrite all routes to `index.html` so direct visits to routes like `/login` load the SPA instead of a static `404`.

Render Key Value format

- Per Render's official docs as of May 18, 2026, use your Key Value instance's internal URL from the `Connect` menu.
- Internal URLs use the `redis://` scheme.
- If internal auth is disabled, the URL usually has no username or password.
- If internal auth is enabled, use the authenticated internal URL Render shows after that change.

What to do after setting env vars

1. Save the environment variables in Render.
2. Trigger a manual redeploy.
3. Verify login against `https://qring-backend-1.onrender.com/api/v1/health` and confirm the backend no longer errors while contacting Redis.
4. If the build still fails, copy the log lines after `npm run build`.
