# FixIt — מדריך טכני לצוות

מסמך עזר פנימי לחברי הצוות. הסברים טכניים על כל טכנולוגיה — איך היא עובדת מאחורי הקלעים, ואיך אנחנו משתמשים בה בפרויקט.

---

## Frontend

### React Native + Expo

**מה זה:**
React Native מריץ JavaScript בתוך JS engine נפרד (Hermes על Android, JSCore על iOS) ומתקשר עם ה-native layer דרך JSI — JavaScript Interface. JSI מאפשר קריאות סינכרוניות ישירות מ-JS לקוד C++ בלי serialization, מה שמוריד latency משמעותית לעומת ה-Bridge הישן.

Expo מוסיפה שכבת abstraction: Native Modules מוכנים (מצלמה, מיקום, notifications), EAS Build לבניית APK/IPA בענן, ו-Expo Go לפיתוח מהיר בלי build מלא.

**איך אנחנו משתמשים:**
- `expo-location` — קבלת מיקום GPS של המכשיר
- `expo-image-picker` — הרשאת גישה לגלריה/מצלמה לתמונות משימה
- `expo-notifications` — קבלת push tokens ו-notification events
- `react-native-maps` + Google Maps SDK — מפת discovery
- React Navigation — stack/tab navigation בין המסכים

**למה בחרנו:**
קוד בסיס אחד ל-iOS, Android ו-Web (Expo Router + Metro bundler). New Architecture (JSI) מפחיתה את ה-bridge bottleneck שהיה בעיה ב-React Native הישן.

**אלטרנטיבות:**
Flutter — Dart VM + Skia/Impeller renderer שכותב UI מאפס (ללא native components). ביצועים מצוינים אבל Dart לא מוכרת לאף אחד.
Native iOS/Android — שתי codebases נפרדות, אי-אפשר לשתף לוגיקה.

---

### TypeScript

**מה זה:**
TypeScript הוא superset של JavaScript שמתקמפל (transpile) ל-JS רגיל ב-build time. הוא מוסיף Static Type System — מערכת טיפוסים שנבדקת בזמן קומפייל, לא בזמן ריצה. TypeScript משתמש ב-Structural Typing (duck typing) ולא ב-Nominal Typing — שני types עם אותה מבנה הם תואמים זה לזה.

**איך אנחנו משתמשים:**
- Strict mode מופעל (`"strict": true` ב-tsconfig) — כולל `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- Prisma מייצר types אוטומטית מה-schema. הקוד ב-backend עובד ישירות עם `@prisma/client` types
- Zod schema מ-infer TypeScript type אוטומטית: `z.infer<typeof TaskSchema>` — אין כפילות בין validation ל-types
- `packages/shared` מכיל types משותפים ל-backend ול-frontend

**למה בחרנו:**
End-to-end type safety: אם שינינו API endpoint או עמודה ב-DB, ה-TypeScript compiler מדגיש כל שימוש שצריך עדכון — ה-build נכשל לפני שהקוד מגיע ל-runtime.

---

### Google Maps API

**מה זה:**
Google Maps Platform היא קולקציה של Web Services ו-Client SDKs. הפרוטוקול הוא HTTPS + JSON (REST), עם API keys לאימות.

**איך אנחנו משתמשים:**
- **Maps JavaScript API** — מפה אינטראקטיבית ב-Web עם markers לכל משימה פתוחה. Markers מקבלים custom icon לפי קטגוריה.
- **Maps SDK for React Native** (`react-native-maps`) — מפת discovery ב-mobile.
- **Places Autocomplete API** — כשמזינים כתובת למשימה חדשה, ה-API מחזיר הצעות עם `place_id`. אנחנו שומרים את הקואורדינטות (lat/lng) שמגיעות מ-geocoding, לא טקסט גולמי.

**מבנה נתוני המיקום:**
קואורדינטות מאוחסנות ב-PostgreSQL כ-PostGIS `GEOMETRY(Point, 4326)` — WGS84 projection (הסטנדרט של GPS). ה-jitter על המיקום הציבורי הוא דטרמיניסטי: hash של task ID → offset קבוע (לא random), כדי שה-pin לא ישתנה בכל טעינה.

**אלטרנטיבות:**
Mapbox — WebGL-based renderer, יותר גמיש ל-styling, אבל pricing model יקר יותר.
OpenStreetMap + Leaflet — חינמי, open data, אבל tile server איטי יותר ו-precision נמוך יותר לישראל.

---

### Firebase Authentication + Firebase Storage

**מה זה:**
Firebase Auth מנהל Identity Provider בצד Google. מאחורי הקלעים הוא מנפיק JWT tokens (JSON Web Tokens) חתומים עם RSA-256 עם private key של Google.

**מבנה ה-ID Token:**
JWT הוא שלושה חלקים מופרדים בנקודות: `Header.Payload.Signature` (base64url encoded).
Payload כולל: `uid`, `email`, `email_verified`, `iat` (issued at), `exp` (expiry — שעה אחת).

**ה-flow המלא:**
1. Client קורא `signInWithEmailAndPassword()` דרך Firebase SDK
2. Firebase מחזיר ID Token (תוקף שעה) + Refresh Token (90 יום)
3. Client שולח ID Token ב-Authorization header: `Bearer <token>`
4. Backend (`auth.ts` middleware) קורא `admin.auth().verifyIdToken(token)`
5. Firebase Admin מוריד את Public Keys של Google ומאמת את חתימת RSA
6. אם תקין ולא פג — `uid` נשלף מה-payload, מחפשים ב-DB

Firebase Storage עובד מעל GCS (Google Cloud Storage). Upload ישיר מה-client עם Signed Policies — הקובץ עולה ישירות ל-GCS, השרת שלנו לא נוגע בו בכלל. אנחנו שומרים רק את ה-download URL.

**למה בחרנו:**
ניהול auth עצמי דורש: bcrypt עם salt rounds מספיק גבוה, JWT signing key rotation, refresh token blacklisting, email verification flow — הכל עם סיכון אבטחתי. Firebase עושה הכל, והסיסמאות לא נוגעות בשרת שלנו.

**אלטרנטיבות:**
Auth0 — enterprise-ready, JWT verification זהה מבחינה טכנית, אבל יקר.
Supabase Auth — open source Firebase alternative, PostgreSQL-native.
bcrypt + JWT ידני — אפשרי אבל מסוכן ו-verbose.

---

## Backend

### Node.js + Express

**מה זה:**
Node.js מריץ V8 (JavaScript engine של Chrome) על השרת. מודל הריצה הוא single-threaded event loop — thread אחד מנהל את כל הבקשות, אבל I/O (רשת, דיסק) הוא non-blocking: הבקשה נשלחת, ה-event loop ממשיך לבקשות אחרות, וכשהתשובה חוזרת — callback/Promise רץ.
זה מצוין ל-I/O-bound workloads (REST APIs, WebSockets) אבל גרוע ל-CPU-bound (image processing, ML).

Express הוא thin wrapper שמוסיף routing ו-middleware pipeline. כל request עובר דרך array של functions, כל אחת יכולה לשנות req/res או לקרוא ל-`next()`.

**ה-pipeline שלנו:**
```
Request → cors() → json() → authMiddleware() → validateMiddleware() → routeHandler() → errorHandler()
```

**למה בחרנו:**
JavaScript end-to-end. Node.js מצוין ל-real-time (Socket.io) כי event loop מטפל ב-WebSocket connections ללא thread-per-connection.

**אלטרנטיבות:**
Fastify — Node.js framework עם JSON serialization מהיר יותר מ-Express. Ecosystem קטן יותר.
NestJS — opinionated framework מעל Express/Fastify עם DI, decorators, modules. Overhead גבוה לפרויקט בסדר גודל שלנו.
Python FastAPI — ASGI, async-native. ביצועים דומים, אבל היינו מאבדים TypeScript end-to-end.

---

### PostgreSQL + PostGIS

**מה זה:**
PostgreSQL הוא RDBMS עם MVCC — Multi-Version Concurrency Control. במקום locks לקריאה, כל transaction רואה snapshot עקבי של ה-DB, מה שמאפשר concurrency גבוה.

PostGIS מוסיף:
- **Geometry types**: `POINT`, `POLYGON`, `LINESTRING` בכל projection
- **Spatial indexes**: R-Tree עם GiST index — מבנה נתונים לאינדוקס אובייקטים במרחב 2D
- **Spatial functions**: `ST_DWithin`, `ST_Distance`, `ST_AsGeoJSON`, `ST_MakePoint` ועוד

**שאילתת ה-discovery:**
```sql
SELECT * FROM tasks
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint($lng, $lat)::geography,
  $radiusMeters
)
AND status = 'OPEN'
ORDER BY ST_Distance(location::geography, ST_MakePoint($lng, $lat)::geography);
```

`::geography` ממיר מ-geometry ל-geography — חישוב מרחק על ספירה (ellipsoid), מדויק יותר לאזורים גדולים מאשר חישוב על מישור.

ה-GiST spatial index על עמודת `location` אומר ש-DB לא סורק כל שורה. ה-R-Tree מאנדקס bounding boxes ומצמצם את החיפוש לאזור הרלוונטי ב-O(log n).

**למה בחרנו:**
PostGIS הוא הפתרון ה-production-grade לgeospatial. MySQL 8 יש לו spatial support אבל חלש מ-PostGIS. MongoDB יש GeoJSON support עם `$near` queries, אבל אנחנו צריכים relational integrity (Foreign Keys, ACID transactions).

---

### Prisma ORM

**מה זה:**
Prisma הוא ORM ל-Node.js שמורכב משלושה חלקים:
1. **Prisma Schema** — DSL שמתאר את ה-data model
2. **Prisma Client** — auto-generated, type-safe query builder
3. **Prisma Migrate** — migration engine שמייצר SQL migrations מ-schema diffs

**Type generation:**
מ-`schema.prisma`, Prisma מייצר TypeScript types ב-`node_modules/@prisma/client`. כל model הופך ל-TypeScript interface, וכל query method מקבל overloaded types בהתאם לfields שביקשת (`select`/`include`).

**Migrations:**
כל שינוי ב-schema: `prisma migrate dev` — Prisma מחשב diff ומייצר SQL migration file. ה-migrations הם SQL files שנשמרים ב-repo ו-applied לפי סדר. כל חבר צוות מריץ `prisma migrate dev` ומקבל את כל ה-migrations החסרים לו.

**Raw SQL ל-PostGIS:**
Prisma לא תומך ב-PostGIS geometry types ישירות. משתמשים ב-`prisma.$queryRaw` עם tagged template literals (מגן מ-SQL injection) לשאילתות geospatial.

**למה בחרנו:**
Type safety חזקה: שגיאות ב-queries נתפסות בזמן קומפייל. Fluent query builder API. Migration system ברור.

**אלטרנטיבות:**
TypeORM — decorator-based, דומה ל-Hibernate. Type safety חלשה יותר.
Drizzle ORM — חדש יותר, SQL-first. Ecosystem קטן יותר.
SQL גולמי עם `pg` — שליטה מלאה, אבל verbose ואין migration management.

---

### Zod

**מה זה:**
Zod היא runtime validation library ל-TypeScript. מגדירים schema declaratively, ו-Zod בודק בזמן ריצה שהנתונים תואמים. ה-schema גם מייצר TypeScript type אוטומטית (דרך `z.infer<>`), אז אין כפילות בין validation ו-types.

**דוגמה:**
```typescript
const CreateTaskSchema = z.object({
  title: z.string().min(3).max(80),
  category: z.nativeEnum(TaskCategory),
  price: z.number().positive().nullable(),
});
type CreateTaskInput = z.infer<typeof CreateTaskSchema>; // TypeScript type חינמי
```

ה-`validate.ts` middleware מריץ `schema.safeParse(req.body)`. אם validation נכשל — `ZodError` מכיל `issues` array עם path + message לכל שגיאה, ומוחזרת תשובת 400 עם פירוט.

**למה בחרנו:**
Joi הוא הvalidator הוותיק אבל לא TypeScript-native — אין type inference אוטומטי. Yup — דומה ל-Zod אבל API פחות ergonomic. Class-validator — decorator-based, תלוי ב-reflect-metadata.

---

### Socket.io

**מה זה:**
Socket.io הוא library שמוסיף שכבת abstraction מעל WebSocket protocol. WebSocket הוא פרוטוקול TCP-based שמספק full-duplex communication — שני הצדדים יכולים לשלוח בכל עת, ללא HTTP request-response cycle.

**WebSocket Handshake:**
```
Client → HTTP Upgrade request: "Upgrade: websocket"
Server → 101 Switching Protocols
החיבור עובר ל-WebSocket frames (לא HTTP עוד)
```

Socket.io מוסיף מעל:
- **Rooms**: broadcast לsubset של clients — `io.to('task_chat_123').emit('message', data)`
- **Fallback**: אם WebSocket לא זמין → Long Polling (HTTP requests עם delay)
- **Auto-reconnect**: reconnection עם exponential backoff

**איך אנחנו משתמשים:**
כל task chat מקבל room בשם `task_chat_{taskId}`. Requester ו-Fixer מבצעים join לאותו room. כשמישהו שולח `send_message` event:
1. השרת שומר הודעה ב-DB
2. `io.to(room).emit('new_message', message)` — כל connected clients ב-room מקבלים
3. אם המשתמש השני לא מחובר (לא ב-room) — נשלחת push notification

**למה בחרנו:**
WebSocket גולמי אפשרי, אבל socket.io מנהל: room state, reconnection, fallback, event API. חוסך זמן פיתוח משמעותי.

**אלטרנטיבות:**
`ws` (npm) — WebSocket גולמי, minimal overhead. צריך לממש rooms/reconnection לבד.
Ably/Pusher — managed WebSocket service. תלות ב-third party ועלות.
Server-Sent Events (SSE) — תמיכה רק בכיוון אחד (שרת→לקוח). לא מתאים לצ'אט דו-כיווני.

---

### Expo Push Notifications

**מה זה:**
Push notifications ל-mobile עוברות דרך שני שירותים native:
- **APNs** (Apple Push Notification service) — לiOS
- **FCM** (Firebase Cloud Messaging) — לAndroid

Expo Push Service הוא abstraction layer — שולחים request אחד לשרתי Expo, והם מנתבים ל-APNs/FCM בהתאם לפלטפורמה.

**ה-flow המלא:**
1. App מקבל `ExpoPushToken` (מזהה ייחודי לinstall) דרך `expo-notifications`
2. Token נשלח לbackend ונשמר ב-`User.expoPushToken` ב-DB
3. כשצריך לשלוח notification — backend קורא ל-Expo Push API עם token + payload
4. Expo → APNs/FCM → device

**Payload structure:**
```typescript
{
  to: expoPushToken,
  title: "הצעה התקבלה!",
  body: "גוי אישר את הצעתך",
  data: { taskId, type: "BID_ACCEPTED" }
}
```
ה-`data` field מגיע ל-app גם ב-background, ומאפשר deep link ישירות למשימה הרלוונטית.

**למה בחרנו:**
APNs דורש Apple Developer certificates ו-APNs auth key. FCM דורש `google-services.json` והגדרה נפרדת. Expo מטפל בשניהם דרך ממשק אחד.

**אלטרנטיבות:**
APNs + FCM ישירות — יותר שליטה, אבל שתי integrations נפרדות.
OneSignal — שירות third-party דומה.

---

## Infrastructure

### Docker + Docker Compose

**מה זה:**
Docker יוצר containers — isolated processes עם filesystem, network ו-process namespace משלהם, מבוססי Linux namespaces ו-cgroups. Container הוא לא VM: אין hypervisor, אין kernel נפרד. הוא רץ ישירות על kernel של ה-host עם isolation.

Image הוא read-only filesystem snapshot שבנוי מ-layers. `postgis/postgis:15-3.3` הוא image מוכן עם PostgreSQL 15 + PostGIS 3.3 מותקנים.

**ה-`docker-compose.yml` שלנו:**
```yaml
services:
  db:
    image: postgis/postgis:15-3.3
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: fixit
      POSTGRES_PASSWORD: ...
    volumes:
      - pgdata:/var/lib/postgresql/data
```

ה-volume `pgdata` הוא persistent storage — נתוני ה-DB נשמרים גם אחרי `docker compose down`.

**למה בחרנו:**
PostGIS מסובך להתקין ידנית (extensions, versions). `docker compose up -d` → DB מוכן תוך שניות. כל חבר צוות רץ אותו image → אין "works on my machine".

---

### GitHub Actions CI

**מה זה:**
CI — Continuous Integration. בכל PR, GitHub מריץ workflows שמוגדרים ב-`.github/workflows/`. ה-workflow רץ ב-runner — VM זמני עם Ubuntu שמוקם, מריץ את ה-steps, ומושמד.

**ה-workflows שלנו:**
- `backend-ci.yml`: `npm run typecheck` + `npm run lint`
- `frontend-ci.yml`: `npm run typecheck` + `npm run lint`

אם אחד נכשל → PR לא יכול להתמזג (branch protection rule על main).

**YAML structure:**
```yaml
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run typecheck
```

**למה בחרנו:**
משולב ישירות ב-GitHub, חינמי ל-public repos. CircleCI/Jenkins דורשים setup חיצוני.

---

## החלטות ארכיטקטורליות

### 1. Monorepo עם npm workspaces

```
/
├── backend/    (Node.js + Express)
├── frontend/   (Expo)
└── packages/
    └── shared/ (types, constants משותפים)
```

npm workspaces מנהל dependencies משותפות ב-root `node_modules` ויוצר symlinks לpackages הפנימיים. `packages/shared` מכיל TypeScript types שה-backend מייצא וה-frontend מייבא — שינוי ב-API contract מתגלה ב-build לפני runtime.

---

### 2. Location Privacy — Deterministic Jitter

הכתובת המדויקת נחשפת רק לאחר קבלת הצעה. ה-public pin מוזז:

```typescript
const jitter = hashTaskId(task.id);  // hash דטרמיניסטי
const publicLat = task.lat + jitter.dlat * 0.002;  // ~200 מטר
const publicLng = task.lng + jitter.dlng * 0.002;
```

Deterministic ולא random — כדי שה-pin לא יראה שונה בכל טעינה (מניעת fingerprinting).

---

### 3. Bid Accept — Prisma Transaction (ACID)

כשRequester מאשר הצעה, שלוש פעולות חייבות לקרות atomically:

```typescript
await prisma.$transaction([
  prisma.bid.update({ where: { id: bidId }, data: { status: "ACCEPTED" } }),
  prisma.bid.updateMany({ where: { taskId, id: { not: bidId } }, data: { status: "REJECTED" } }),
  prisma.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS", fixerId } }),
]);
```

Transaction מבטיח ACID: אם אחת הפעולות נכשלת, הכל מתבטל. PostgreSQL משתמש ב-MVCC — אין explicit locks, רק serialization failure אם יש race condition.
