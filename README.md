# Vendor & Contractor Management System

A full-stack web application for **Glory Simon Interiors** to manage vendors, contractors, clients, projects, payments, and day-to-day interior design operations.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Auth:** JWT-based authentication

## Features

- Dashboard with stats, charts, and recent activities
- Vendor management (carpenters, painters, electricians, plumbers, suppliers)
- Client management (homeowners, commercial, builders, architects)
- Project tracking with full lifecycle (enquiry → completion)
- Task management with Kanban board
- Payment tracking and summaries
- Quotation builder with line items
- Site visit scheduling
- Vendor rating and performance system
- Role-based access (Admin, Project Manager, Designer)

## Setup & Installation

### Backend

```bash
cd backend
npm install
npm run seed    # Populate database with sample data
npm run dev     # Start server on port 5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev     # Start dev server on port 3000
```

## Login Credentials (Demo)

| Email | Password | Role |
|-------|----------|------|
| admin@glorysimon.com | password123 | Admin |
| rajesh@glorysimon.com | password123 | Project Manager |
| priya@glorysimon.com | password123 | Designer |

## Project Structure

```
vendor_management/
├── backend/
│   ├── server.js           # Express server entry
│   ├── database.js         # SQLite schema & connection
│   ├── seed.js             # Sample data seeder
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   └── routes/
│       ├── auth.js         # Login/Register
│       ├── clients.js      # Client CRUD
│       ├── vendors.js      # Vendor CRUD + ratings
│       ├── projects.js     # Project management
│       ├── tasks.js        # Task management
│       ├── payments.js     # Payment tracking
│       ├── quotations.js   # Quotation builder
│       ├── dashboard.js    # Stats & analytics
│       └── site-visits.js  # Site visit scheduling
├── frontend/
│   ├── src/
│   │   ├── pages/          # All page components
│   │   ├── components/     # Reusable UI components
│   │   └── utils/          # API utilities
│   └── index.html
└── README.md
```

## Team

Built as part of an internship project for Glory Simon Interiors.
