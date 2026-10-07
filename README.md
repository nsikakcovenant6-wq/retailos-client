# RetailOS Client

Next.js frontend for the RetailOS Flask API.

## Architecture

```
Browser
  │
  │ HTTPS + credentialed REST requests
  ▼
retailos-client (Next.js)
  │
  │ REST
  ▼
retailos-server (Flask)
  │
  ▼
PostgreSQL
```

The client no longer owns authentication, database access, inventory logic, sales transactions, reports, or server-side API routes. The Flask server is the source of truth.

## Run locally

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Then:

```bash
npm install
npm run dev
```

The server must be running separately and must allow the frontend origin with:

```env
FRONTEND_URL=http://localhost:3000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax
```

For a production frontend hosted on another domain, set `FRONTEND_URL` to the exact frontend origin and use HTTPS. The server's cross-origin session cookie should use `SameSite=None` and `Secure=true`.

## Supported server-backed UI

- Authentication
- Store dashboard
- Products
- Inventory and stock adjustments
- Sales/POS
- Transactions
- Customers
- Low-stock alerts
- Settings

Purchases, reports, employee roles, and notification APIs were removed from the client because they are not currently exposed by the Flask server contract.

## API contract

The frontend calls the server directly with `credentials: include` so the Flask session cookie remains HttpOnly.

Examples:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /product/list?store_id=...`
- `POST /product/create`
- `PATCH /product/update`
- `DELETE /product/delete`
- `POST /product/adjust`
- `POST /sales`
- `GET /sales?store_id=...`
- `GET /dashboard?store_id=...`
- `GET /customers?store_id=...`
- `POST /customers`
- `GET /alerts?store_id=...`
- `POST /alerts/generate-low-stock?store_id=...`
- `POST /alerts/resolve?store_id=...&id=...`
