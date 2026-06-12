# BillNova — Frontend

React SPA for **BillNova**, a subscription-based billing/POS SaaS for small retail businesses in India. Premium, responsive, keyboard-friendly POS built with ShadCN UI.

> Backend repo: https://github.com/krish6622/BillNova_Backend
> Phase 1 design docs (FRD, API spec, architecture, etc.) live in the backend repo's `docs/`.

## Tech Stack

React · TypeScript · Vite · Tailwind CSS · ShadCN UI · React Router · TanStack Query · React Hook Form · Zod · Zustand · Axios

## Layout

```
src/
├─ main.tsx App.tsx          bootstrap + router
├─ pages/                    Dashboard, POS, Products, Purchases, Inventory, Reports, Settings
├─ components/
│  ├─ ui/                    ShadCN components
│  ├─ layout/                AppShell, nav
│  └─ common/                Async (loading/empty/error), etc.
├─ features/                 per-domain hooks + api + types
├─ lib/                      api (Axios client), queryClient, utils
├─ stores/                   Zustand (cart, ui)
└─ schemas/                  Zod schemas
```

## Quick Start (Node 18+)

```bash
npm install
cp .env.example .env.local      # set VITE_API_BASE_URL / proxy target
npm run dev                     # http://localhost:5173
npm run build                   # type-check + production bundle -> dist/
npm run lint
```

During `npm run dev`, Vite proxies `/api` to `VITE_API_PROXY_TARGET` (default `http://localhost:8000`) — run the backend separately.

## API Connectivity

The SPA talks to the backend only through the shared Axios client (`src/lib/api.ts`); no ad-hoc `fetch`.

- **Dev:** `VITE_API_PROXY_TARGET` → backend dev server.
- **Prod (Docker/nginx):** set `VITE_API_BASE_URL` to the backend's public URL at build time, or place this SPA behind a reverse proxy that routes `/api` to the backend. The bundled `nginx.conf` proxies `/api` to a host named `backend` — adjust it to your deployment.

## Build & Deploy (Docker)

```bash
docker build -t billnova-frontend .
docker run -p 8080:80 billnova-frontend     # serves dist/ via nginx
```

## Pages (Phase 1 — all implemented)

Login · Dashboard (KPI cards) · Billing POS (search, cart, live GST, split payments, print/reprint) ·
Products (CRUD, search, pagination) · Purchases (line items, cancel) · Inventory (stock, ledger, adjust,
low-stock) · Reports (sales/GST/HSN/stock + PDF/Excel export) · Subscription (usage + plans) ·
Settings (profile, invoice prefs, GST defaults, user management). A global usage banner warns at 80% /
blocks at 100%. Destructive actions use confirmation dialogs; every data view has loading/empty/error states.
