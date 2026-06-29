# TechVolt SCM

Full-stack supply chain management platform for Indian electronics distributors — real-time inventory, purchase orders, shipments, and automated alerts.

## Stack

**Backend** — Node.js · Express · PostgreSQL · Socket.io · JWT · Resend  
**Frontend** — React 18 · Vite · Plain CSS · Recharts · Axios

## Quick Start

**1. Install & configure**
```bash
git clone https://github.com/aashnakanodia/Supply_Chain_Management.git
cd Supply_Chain_Management
npm install
cp .env.example .env   # fill in DB credentials + JWT secrets
```

**2. Database**
```bash
# Create DB in psql:  CREATE DATABASE supply_chain_db;
npm run migrate
npm run seed
```

**3. Run**
```bash
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Environment Variables

```env
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
RESEND_API_KEY        # resend.com — for password reset emails
APP_URL=http://localhost:5173
```
