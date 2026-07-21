# Synapse – Supply Chain Management System

A full-stack supply chain management platform for consumer electronics distribution. Built for NovaMart Distribution Pvt. Ltd. as a demo company, Synapse covers the complete procurement-to-fulfilment workflow with a built-in AI assistant.

---

## Tech Stack

**Frontend:** React 18, Vite, plain CSS, Socket.IO client, Lucide icons  
**Backend:** Node.js, Express, PostgreSQL, Socket.IO, JWT (access + refresh tokens)  
**AI:** Google Gemini 2.5 Flash via `@google/genai` with function calling  

---

## Features

- **Inventory Management** — multi-warehouse stock tracking, adjustments, reorder point monitoring
- **Purchase Orders** — full 5-stage lifecycle: pending → approved → ordered → received / cancelled
- **Shipments** — carrier tracking, delivery confirmation, automatic stock reconciliation on delivery
- **Suppliers** — supplier catalogue with preferred supplier links per product
- **Warehouses** — multi-location support with per-warehouse staff scoping
- **Alerts** — automated low-stock alerts with severity levels, auto-resolve on restock
- **Users** — user management with role assignment and activate/deactivate controls
- **Dashboard** — live KPI cards for inventory value, PO status, alert counts
- **Synapse AI** — natural language assistant with 15+ tools for real CRUD operations, per-user session persistence
- **Real-time updates** — Socket.IO broadcasts inventory changes, new alerts, and PO status updates live

---

## Role-Based Access Control

Five roles with granular permission enforcement at both API middleware and UI layer:

| Role | Key Permissions |
|---|---|
| `admin` | Full access — approve POs, manage users, all write operations |
| `procurement_manager` | Create POs, manage suppliers/warehouses, create shipments |
| `warehouse_staff` | Adjust inventory, update shipments, resolve non-low-stock alerts (own warehouse only) |
| `supplier` | Read-only view of their own POs and shipments |
| `viewer` | Read-only access across all modules |

---

## Seed Accounts (NovaMart)

| Role | Email | Password |
|---|---|---|
| Admin | `p.sharma@novamart.in` | `PSharma@Nova26` |
| Procurement Manager | `r.gupta@novamart.in` | `RGupta@Nova26` |
| Warehouse Staff (Delhi) | `d.kumar@novamart.in` | `DKumar@Nova26` |
| Warehouse Staff (Mumbai) | `s.patel@novamart.in` | `SPatel@Nova26` |
| Supplier (Samsung) | `a.malhotra@samsung-india.com` | `AMalhotra@Samsung26` |
| Supplier (boAt) | `r.sharma@boat-lifestyle.com` | `RSharma@Boat26` |
| Viewer | `r.agarwal@novamart.in` | `RAgarwal@Nova26` |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Seed the database

```bash
node backend/scripts/seed.js
```

### Environment Variables (backend/.env)

```
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=supply_chain_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
```

---

## Project Structure

```
supply_chain_management/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   └── scripts/
│       └── seed.js
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── api/
        ├── context/
        └── hooks/
```
