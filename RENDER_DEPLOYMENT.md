Railway frontend deploy checklist

Active call architecture

- App UI and signaling bootstrap are hosted on Railway or your chosen frontend host.
- Socket.IO signaling runs through the backend on Railway.
- Media stays peer-to-peer over native WebRTC.
- TURN must stay on an external VPS, not on Render.

Backend prerequisites

- The backend `REDIS_URL` must be the exact private Railway database URL from the same Railway project as the backend service.
- Use the private `postgresql://...@postgres.railway.internal:5432/...` URL inside Railway, not the public hostname, unless you intentionally need external access.
- Your backend service and PostgreSQL service must be in the same Railway project so the internal hostname resolves.
- If `REDIS_URL` is wrong or points to an unreachable host, login can fail with a backend `500`, and the browser may misleadingly show it as a CORS error.
- The backend also needs TURN env vars for reliable production calling: `WEBRTC_TURN_URL` and/or `WEBRTC_TURN_TLS_URL`, plus `WEBRTC_TURN_USERNAME` and `WEBRTC_TURN_CREDENTIAL`.
- Leave `WEBRTC_REQUIRE_TURN=false` if you want the API to boot before TURN is ready. Set `WEBRTC_REQUIRE_TURN=true` only when you want deploys to fail fast on missing TURN config.

Required environment variables

Set these in the Railway frontend service or in your frontend host's environment settings:

```env
VITE_API_BASE_URL=https://qring-backend-production.up.railway.app/api/v1
VITE_SOCKET_URL=https://qring-backend-production.up.railway.app
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

Recommended deployment settings

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `22.12.0`
- Rewrite all routes to `index.html` so direct visits to routes like `/login` load the SPA instead of a static `404`.

Railway database notes

- On Railway, use the database service's private internal connection string from the project variables.
- Internal URLs use the database scheme that Railway provides, usually `postgresql://`.
- If you also need a public connection string for local tools, keep that separate from the backend's private `DATABASE_URL`.

What to do after setting env vars

1. Save the environment variables in Railway.
2. Trigger a manual redeploy.
3. Verify login against `https://qring-backend-production.up.railway.app/api/v1/health` and confirm the backend no longer errors while contacting PostgreSQL.
4. Start a real homeowner-to-visitor call and confirm ICE reaches either direct or relay candidates within a few seconds.
5. Confirm a `turns:` relay path still works when UDP is blocked.
6. Switch one device between WiFi and cellular and confirm the call recovers.
7. Lock and unlock an Android device during a live call and confirm media recovers.
8. If the build still fails, copy the log lines after `npm run build`.
