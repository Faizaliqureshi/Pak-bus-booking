# TicketPass — Technical Specification

Pakistan intercity bus booking platform (repo: Pak-bus-booking).  
Stack: Next.js 16 App Router, React 19, Prisma, Neon Postgres, Redis seat locks, Tailwind.

This document matches the current `main` codebase: three portals (Master, Partner, Passenger).

---

## 1. System overview

```
Passenger browser ─┐
Master portal ─────┼──► Next.js App Router ──► Route Handlers
Partner portal ────┘         │
                             ├── HMAC cookie session (ticketpass_session)
                             ├── Prisma Client ──► Neon Postgres
                             ├── Redis / in-memory ──► seat_lock:{tripId}:{seat}
                             └── Twilio (WhatsApp / SMS, best-effort)
```

| Portal | Roles | Entry |
|--------|-------|--------|
| Master | `MASTER`, `ADMIN` | `/master` via `/staff/login` |
| Partner | `OPERATOR` | `/partner/fleet` via `/staff/login` |
| Passenger | `PASSENGER` | `/auth/sign-in`, `/`, booking routes |

Legacy `/admin/*` redirects into Master. `/conductor/*` redirects to staff login.

---

## 2. Repository structure

```
src/app/                 Pages + API route handlers
src/components/          UI (booking, layout, master, ui)
src/lib/                 Auth, Prisma, Redis, seat/checkout/wallet
prisma/schema.prisma     Data model
prisma/seed.ts           Demo users + Karachi→Lahore trip
docs/TECHNICAL.md        This spec
tests/booking-flow.spec.ts
```

Key libraries:

| File | Role |
|------|------|
| `src/lib/auth.ts` | Session cookie, password helpers, `staffHomeForRole` |
| `src/lib/admin-auth.ts` | `getAdminUser`, `getMasterUser`, `getPartnerUser` |
| `src/lib/prisma.ts` | Prisma singleton |
| `src/lib/redis.ts` | ioredis or `REDIS_URL=memory://` |
| `src/lib/redis-lock.ts` | SET NX seat holds (TTL 600s) + Prisma `SeatLock` |
| `src/lib/seat-availability.ts` | Segment overlap + seat statuses |
| `src/lib/booking-utils.ts` | Cities, bus layout labels, PKR/time |
| `src/lib/checkout-utils.ts` | PNR, CNIC/phone, QR payload |
| `src/lib/wallet.ts` / `rewards.ts` | Ledger helpers |

---

## 3. Frontend

- **Framework:** Next.js App Router. Server layouts gate staff portals.
- **UI:** Tailwind + shadcn/Base UI (`Button`, `Select`, `Input`).
- **State:** Local React state + fetch. Seat holds keyed by demo or signed-in `userId`.
- **Chrome:** `Navbar` / `Footer` hidden on `/master`, `/staff`, `/partner/fleet`, `/admin`.

### Passenger flow

1. `/` — `SearchWidget` (default Karachi → Lahore).
2. `/search?origin=&destination=&date=` — `SearchResultsClient` loads trips + `/api/demo-user`.
3. Expand **Check Seats** — `InteractiveSeatMap` locks seats (max 4).
4. **Continue Booking** — `POST /api/checkout/create` → `/checkout/[bookingId]`.
5. `CheckoutForm` — JazzCash / EasyPaisa / Card / 1BILL → `POST /api/checkout/process`.
6. `/ticket/[pnr]` — `ETicketView`.

### Master / Partner

- Master: sidebar at `/master` plus ops pages (dashboard, partners, routes, buses, manifest, settings).
- Partner: `/partner/fleet` create/list own buses.
- Staff login demos: `master@ticketpass.pk`, `partner@ticketpass.pk` (`password123`).

---

## 4. Backend conventions

- Runtime: `export const runtime = "nodejs"` on API routes.
- Envelope:

```json
{ "success": true, "data": {}, "message": "optional" }
```

```json
{ "success": false, "message": "Human error" }
```

Some admin gates still return `{ "error": "Unauthorized" }` with HTTP 401.

| HTTP | Typical meaning |
|------|-----------------|
| 200 | Read / extend lock / pay |
| 201 | Created (signup, lock, booking, bus, route, walk-in) |
| 400 | Validation |
| 401 | Missing/invalid session |
| 403 | Wrong portal role |
| 409 | Conflict (email, seat held, lock expired) |
| 500 | Unhandled |

---

## 5. Database (ERD)

PostgreSQL via Prisma. Money fields are `Decimal`, serialized as `number` in JSON.

### Enums

- `UserRole`: `PASSENGER` | `OPERATOR` | `CONDUCTOR` | `ADMIN` | `MASTER`
- `PaymentStatus`: `PENDING` | `PAID` | `FAILED` | `REFUNDED`
- `Gender`: `MALE` | `FEMALE` | `OTHER`

`CONDUCTOR` remains in the schema; there is no conductor portal.

### Tables

**users** — `id`, `email` unique, `passwordHash`, `name`, `phone`, `role`, profile fields, `createdById` (self-FK), `createdAt`.

**buses** — `operatorId` → users, `busNumber` unique, `layoutType` (`2x2` | `2x1` | `2x1_SLEEPER`), `totalSeats`.

**routes** — `name`, `originCity`, `destinationCity`, `distanceKm`. Index on origin+destination.

**route_stops** — `routeId`, `stationName`, `stopOrder`, `distanceFromOrigin`. Unique `(routeId, stopOrder)`.

**trips** — `busId`, `routeId`, `departureTime`, `arrivalTime`, `basePrice`.

**seat_locks** — `tripId`, `seatNumber`, `userId`, `lockToken` unique, `expiresAt`. Unique `(tripId, seatNumber)`.

**bookings** — `pnr` unique, `userId`, `tripId`, `totalPrice`, `paymentStatus`, `paymentMethod`, `qrCodeUrl`, `contactPhone`, `contactEmail`, `heldSeats`, `boardingStopId`, `dropStopId`, `lockExpiresAt`.

**tickets** — `bookingId`, `seatNumber`, passenger name/gender/cnic, `boardingStopId`, `dropStopId`, `isBoarded`, `boardedAt`. Unique `(bookingId, seatNumber)`.

**partner_applications** — onboarding form, `status` PENDING|REVIEWING|APPROVED|REJECTED.

**wallets** / **wallet_transactions** — 1:1 user wallet, types TOPUP|WITHDRAW|REFUND|ADJUSTMENT.

**rewards_accounts** / **reward_transactions** — 1:1 points ledger.

### Relationships

```
User 1──N Bus (operator)
User 1──N Booking
User 1──N SeatLock
User 1──1 Wallet ──N WalletTransaction
User 1──1 RewardsAccount ──N RewardTransaction
User 1──N User (createdBy)

Bus 1──N Trip
Route 1──N RouteStop
Route 1──N Trip
Trip 1──N SeatLock
Trip 1──N Booking
Booking 1──N Ticket
Ticket N──1 RouteStop (board)
Ticket N──1 RouteStop (drop)
```

---

## 6. Redis

Key: `seat_lock:{tripId}:{seatNumber}`  
Value: `userId`  
TTL: 600 seconds (NX acquire; same user can extend).

Mirrored in `seat_locks` for persistence. Playwright sets `REDIS_URL=memory://`.

---

## 7. API endpoints and bodies

### 7.1 Auth

**POST `/api/auth/signup`**

```json
{ "name": "Ali Khan", "email": "ali@example.pk", "phone": "03001234567", "password": "secret1" }
```

201:

```json
{ "success": true, "data": { "id": "…", "email": "…", "name": "…", "phone": "+923001234567", "role": "PASSENGER" } }
```

Sets `ticketpass_session`.

**POST `/api/auth/signin`** — `{ email, password }` → same `data` shape + cookie.

**POST `/api/auth/staff-signin`** — `{ email, password }`. Roles: MASTER, ADMIN, OPERATOR.

```json
{
  "success": true,
  "data": {
    "id": "…", "email": "…", "name": "…", "role": "MASTER",
    "redirectTo": "/master"
  }
}
```

`OPERATOR` → `/partner/fleet`. Others → 403.

**GET `/api/auth/me`** — session user or `{ success: false, message: "Not signed in." }`.

**POST `/api/auth/signout`** — clears cookie.

**GET `/api/demo-user`** — seeded `ali.khan@example.pk` `{ id, email, name }` for guest seat locks.

---

### 7.2 Search and seats

**GET `/api/trips/search?origin=Karachi&destination=Lahore&date=YYYY-MM-DD`**

```json
{
  "success": true,
  "data": [
    {
      "id": "trip_…",
      "departureTime": "ISO",
      "arrivalTime": "ISO",
      "durationMs": 64800000,
      "basePrice": 4500,
      "bus": { "id": "…", "busNumber": "DAEWOO-786", "layoutType": "2x2", "totalSeats": 40 },
      "operator": { "id": "…", "name": "Daewoo" },
      "route": { "id": "…", "name": "…", "originCity": "Karachi", "destinationCity": "Lahore", "distanceKm": 1260 },
      "boardingStop": { "id": "…", "name": "…", "order": 1 },
      "dropStop": { "id": "…", "name": "…", "order": 5 },
      "stops": [{ "id": "…", "name": "…", "order": 1 }]
    }
  ]
}
```

**GET `/api/trips/[tripId]/seats?boardingStopId=&dropStopId=&userId=`**

```json
{
  "success": true,
  "data": {
    "tripId": "…",
    "boardingStop": { "id": "…", "name": "…", "order": 1 },
    "dropStop": { "id": "…", "name": "…", "order": 5 },
    "totalSeats": 40,
    "availableSeatsCount": 38,
    "seats": [
      { "seatNumber": "1", "status": "AVAILABLE" },
      { "seatNumber": "12", "status": "BOOKED", "gender": "MALE", "bookedSegment": { "boardingStopOrder": 1, "dropStopOrder": 5 } },
      { "seatNumber": "3", "status": "LOCKED_BY_YOU" },
      { "seatNumber": "4", "status": "LOCKED_BY_OTHER" }
    ]
  }
}
```

**POST `/api/seats/lock`** — `{ tripId, seatNumber, userId }`

```json
{
  "success": true,
  "message": "Seat locked successfully.",
  "data": {
    "tripId": "…", "seatNumber": "1", "userId": "…",
    "lockToken": "uuid", "expiresAt": "ISO", "ttlSeconds": 600, "extended": false
  }
}
```

409 if held by another passenger.

**POST `/api/seats/unlock`** — `{ tripId, seatNumber, userId }` → `{ success, message }`.

---

### 7.3 Checkout

**POST `/api/checkout/create`**

```json
{
  "tripId": "…",
  "userId": "…",
  "seatNumbers": ["1", "2"],
  "boardingStopId": "…",
  "dropStopId": "…"
}
```

201:

```json
{
  "success": true,
  "data": {
    "bookingId": "…",
    "pnr": "PKR-XXXX",
    "lockExpiresAt": "ISO",
    "checkoutUrl": "/checkout/…"
  }
}
```

Creates `Booking` PENDING with `heldSeats`.

**POST `/api/checkout/process`**

```json
{
  "bookingId": "…",
  "contactPhone": "03001234567",
  "contactEmail": "ali@example.pk",
  "paymentMethod": "JAZZCASH",
  "passengers": [
    { "seatNumber": "1", "fullName": "Ali Khan", "gender": "MALE", "cnic": "42101-1234567-1" }
  ]
}
```

`paymentMethod`: `JAZZCASH` | `EASYPAISA` | `CARD` | `ONEBILL`.

```json
{
  "success": true,
  "data": {
    "pnr": "PKR-XXXX",
    "paymentStatus": "PAID",
    "paymentMethod": "JAZZCASH",
    "qrCodeUrl": "…",
    "ticketUrl": "/ticket/PKR-XXXX"
  }
}
```

Creates `Ticket` rows, clears Redis locks. Demo payments authorize without a live PSP.

---

### 7.4 Passenger account

**GET `/api/account/profile`** — session profile (id, email, name, phone, role, title, names, DOB, address, passport, NIC).

**PATCH `/api/account/profile`** — same fields (firstName required, PK phone, optional 13-digit NIC).

**GET `/api/account/wallet`**

```json
{
  "success": true,
  "data": {
    "balance": 0,
    "currency": "PKR",
    "updatedAt": "ISO",
    "userName": "Ali Khan",
    "transactions": [
      { "id": "…", "type": "TOPUP", "status": "COMPLETED", "amount": 500, "description": "…", "reference": "…", "createdAt": "ISO" }
    ]
  }
}
```

**GET `/api/account/rewards`** — `{ balance, transactions[] }` (EARN/REDEEM, PENDING/REWARDED/USED).

---

### 7.5 Master / admin ops

Auth: `getAdminUser()` = MASTER or ADMIN unless noted.

| Method | Path | Body / query | Success `data` |
|--------|------|--------------|----------------|
| GET | `/api/master/overview` | — | `summary`, `finance`, `admins`, `partners`, `conductors`, `fleet`, `recentBookings` |
| POST | `/api/master/staff` | `{ role: "ADMIN"\|"PARTNER", name, email, phone?, password? }` MASTER only | `{ id, name, email, role, temporaryPassword, loginUrl, roleLabel }` 201 |
| GET | `/api/master/admins` | — | admin list |
| POST | `/api/master/admins` | `{ name, email, password }` | created admin |
| GET | `/api/admin/stats` | — | `{ revenueToday, occupancyRate, ticketsSoldToday, activeTripsToday, fleetSize }` |
| GET | `/api/admin/bookings/recent` | — | 12 `{ id, pnr, passengerName, route, totalPrice, paymentStatus, createdAt }` |
| GET/POST | `/api/admin/partners` | POST `{ name, email, password? }` | operators |
| GET/POST | `/api/admin/buses` | POST `{ busNumber, layoutType, totalSeats, operatorId? }` | buses |
| GET/POST | `/api/admin/routes` | POST `{ name, originCity, destinationCity, distanceKm }` | routes + stops |
| POST | `/api/admin/routes/[routeId]/stops` | `{ stationName, stopOrder, distanceFromOrigin }` | stop |
| GET/POST | `/api/admin/trips` | POST `{ busId, routeId, departureTime, arrivalTime, basePrice }` | trips |
| GET | `/api/admin/manifest/[tripId]` | — | trip + seats `BOOKED`/`LOCKED`/`AVAILABLE` + tickets |
| POST | `/api/admin/walk-in` | `{ tripId, seatNumber, passengerName, gender, cnic, phone, boardingStopId, dropStopId }` | `{ bookingId, pnr, ticketUrl }` 201 PAID |

Master overview `summary`:

```json
{
  "totalStaff": 4,
  "admins": 1,
  "partners": 1,
  "conductors": 0,
  "fleetBuses": 1,
  "fleetSeats": 40,
  "bookingsPaid": 1,
  "bookingsPending": 0,
  "bookingsFailed": 0,
  "bookingsRefunded": 0,
  "bookingsTotal": 1
}
```

---

### 7.6 Partner

**GET `/api/partner/buses`** — own fleet `{ id, busNumber, layoutType, totalSeats, tripCount, createdAt }`.

**POST `/api/partner/buses`**

```json
{ "busNumber": "KAINAT-101", "layoutType": "2x1", "totalSeats": 32 }
```

201 `{ success: true, data: bus }`. 409 if number exists.

**POST `/api/partner/register`** (public)

```json
{
  "companyName": "…", "contactName": "…", "email": "…", "phone": "…",
  "city": "Lahore", "fleetSize": 12, "routesServed": "LHE-KHI", "message": "…"
}
```

201 `{ data: { id, status: "PENDING" }, message: "Application submitted…" }`.

---

## 8. Page index

### Passenger (booking + account)

| # | Path | File | Notes |
|---|------|------|-------|
| 1 | `/` | `src/app/page.tsx` | Hero + search |
| 2 | `/search` | `src/app/search/page.tsx` | Results |
| 3 | `/checkout/[bookingId]` | `src/app/checkout/[bookingId]/page.tsx` | Pay |
| 4 | `/ticket/[pnr]` | `src/app/ticket/[pnr]/page.tsx` | E-ticket |
| 5 | `/booking/passengers` | `src/app/booking/passengers/page.tsx` | Legacy step |
| 6 | `/auth/sign-in` | `src/app/auth/sign-in/page.tsx` | Passenger login |
| 7 | `/auth/sign-up` | `src/app/auth/sign-up/page.tsx` | Signup |
| 8 | `/account/edit-profile` | `src/app/account/edit-profile/page.tsx` | Profile |
| 9 | `/account/wallet` | `src/app/account/wallet/page.tsx` | Wallet |
| 10 | `/account/cancel-booking` | `src/app/account/cancel-booking/page.tsx` | Manage PNR |
| 11 | `/air/bookings/search` | `src/app/air/bookings/search/page.tsx` | Flights soon |
| 12 | `/air/sasta-rewards` | `src/app/air/sasta-rewards/page.tsx` | Alias |
| 13 | `/hotels` | `src/app/hotels/page.tsx` | Soon |
| 14 | `/umrah-packages` | `src/app/umrah-packages/page.tsx` | Soon |
| 15 | `/holiday-packages` | `src/app/holiday-packages/page.tsx` | Soon |
| 16 | `/visa` | `src/app/visa/page.tsx` | Soon |
| 17 | `/rewards` | `src/app/rewards/page.tsx` | Rewards |
| 18 | `/sasta-rewards` | `src/app/sasta-rewards/page.tsx` | Alias |
| 19 | `/about-us` | `src/app/about-us/page.tsx` | Company |
| 20 | `/career` | `src/app/career/page.tsx` | Careers |
| 21 | `/contact-us` | `src/app/contact-us/page.tsx` | Contact |
| 22 | `/faqs` | `src/app/faqs/page.tsx` | FAQs |
| 23 | `/terms-and-conditions` | `src/app/terms-and-conditions/page.tsx` | Legal |
| 24 | `/privacy-policy` | `src/app/privacy-policy/page.tsx` | Legal |
| 25 | `/cancellation-refund-policy` | `src/app/cancellation-refund-policy/page.tsx` | Legal |

`src/app/pages/*` duplicates several static pages for older `/pages/...` URLs.

### Staff

| # | Path | File | Notes |
|---|------|------|-------|
| 26 | `/staff/login` | `src/app/staff/login/page.tsx` | Master + Partner demos |
| 27 | `/master` | `src/app/master/page.tsx` | Control centre |
| 28 | `/master/dashboard` | `src/app/master/dashboard/page.tsx` | Today KPIs |
| 29 | `/master/partners` | `src/app/master/partners/page.tsx` | Operators |
| 30 | `/master/routes` | `src/app/master/routes/page.tsx` | Routes / trips |
| 31 | `/master/buses` | `src/app/master/buses/page.tsx` | Fleet |
| 32 | `/master/manifest` | `src/app/master/manifest/page.tsx` | Manifest + walk-in |
| 33 | `/master/settings` | `src/app/master/settings/page.tsx` | Portal notes |
| 34 | `/partner/register` | `src/app/partner/register/page.tsx` | Public apply |
| 35 | `/partner/fleet` | `src/app/partner/fleet/page.tsx` | Partner coaches |
| 36 | `/admin` | `src/app/admin/page.tsx` | → `/master` |
| 37 | `/admin/[...path]` | `src/app/admin/[...path]/page.tsx` | Maps old admin paths |
| 38 | `/conductor/[[...path]]` | `src/app/conductor/[[...path]]/page.tsx` | → `/staff/login` |

---

## 9. Auth and demo accounts

Cookie: `ticketpass_session` = `{userId}.{exp}.{hmac}` (14 days).  
Passwords: scrypt (`scrypt$salt$hash`).

| Email | Password | Portal |
|-------|----------|--------|
| master@ticketpass.pk | password123 | `/master` |
| partner@ticketpass.pk | password123 | `/partner/fleet` |
| ali.khan@example.pk | password123 | `/` after `/auth/sign-in` |

Optional seed user `admin@ticketpass.pk` also lands on `/master` (ADMIN role).

---

## 10. Environment

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | Neon Postgres |
| `REDIS_URL` | Upstash Redis, or `memory://` for local/E2E |
| `SESSION_SECRET` / `TICKET_QR_SECRET` | Cookie + QR HMAC |
| `TWILIO_*` | Ticket WhatsApp (optional; 401 is ignored) |

---

## 11. Tests

`npm run test:e2e` — Playwright: home → search Karachi–Lahore → seat → checkout → e-ticket.
