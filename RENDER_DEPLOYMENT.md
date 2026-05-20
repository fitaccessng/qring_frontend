Render frontend deploy checklist

Active call architecture

- App UI and signaling bootstrap are hosted on Render.
- Socket.IO signaling runs through the backend on Render.
- Media stays peer-to-peer over native WebRTC.
- TURN must stay on an external VPS, not on Render.

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
VITE_WEBRTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":["turn:YOUR_TURN_HOST:3478?transport=udp","turn:YOUR_TURN_HOST:3478?transport=tcp"],"username":"YOUR_TURN_USERNAME","credential":"YOUR_TURN_PASSWORD"},{"urls":"turns:YOUR_TURN_HOST:5349?transport=tcp","username":"YOUR_TURN_USERNAME","credential":"YOUR_TURN_PASSWORD"}]
VITE_CALL_CONNECT_TIMEOUT_MS=8000
VITE_CALL_RING_TIMEOUT_MS=30000
VITE_RTC_MONITORING_URL=https://YOUR_BACKEND_OR_MONITORING_ENDPOINT/rtc
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=qring-7ced9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qring-7ced9
VITE_FIREBASE_APP_ID=1:103048317220:web:72f9667db6daae62504bb1
VITE_FIREBASE_VAPID_KEY=YOUR_FIREBASE_VAPID_KEY
```

Notes

- `VITE_WEBRTC_ICE_SERVERS` must include at least one TURN server for production mobile calls.
- Keep the TURN host off Render. Use your VPS hostname or public IP.
- Prefer both `turn:` on `3478` and `turns:` on `5349`.
- Include both UDP and TCP transport variants for `turn:` where possible.
- Keep video defaults conservative for mobile networks: `640x360` and `24fps`.
- Audio quality should be prioritized above video quality when debugging bad-network behavior.
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
4. Start a real homeowner-to-visitor call and confirm ICE reaches either direct or relay candidates within a few seconds.
5. Confirm a `turns:` relay path still works when UDP is blocked.
6. Switch one device between WiFi and cellular and confirm the call recovers.
7. Lock and unlock an Android device during a live call and confirm media recovers.
8. If the build still fails, copy the log lines after `npm run build`.
