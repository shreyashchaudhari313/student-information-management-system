# CampusDesk · Modern Student Information System

A high-performance, bespoke three-tier Student Information System (SIS) crafted for educational institutions:

```text
Web Browser → Vercel (React + Vite SPA) → Render (Express REST API) → MongoDB Atlas
```

---

## What's New & Upgraded

- **Handcrafted UI/UX (Non-AI Look & Feel)**:
  - Deep space obsidian dark theme & crisp modern light theme with seamless toggle and memory.
  - Multi-hue student avatar generator with deterministic gradients and initials.
  - Dual presentation modes: **Dense Data Table** and **Interactive Card Grid**.
  - Student Academic Profile Quick-View modal with direct email/phone actions and copy-to-clipboard student IDs.
  - Custom danger modal for deletions with protection warnings.
  - Live API status monitor with ping and connectivity beacon.
  - CSV export for instant student roster downloads.
  - Print-ready stylesheet for generating formal campus reports.
  - Responsive layout for desktop, tablet, and mobile.

- **Enterprise-Grade Animations & Micro-Interactions**:
  - Glassmorphic navigation bar and floating metric cards (`backdrop-filter: blur(16px)`).
  - Floating toast notification system with automatic progress dismissal.
  - Subtle card hover lifts, animated section badges, and shimmer skeleton loaders.

- **Robust REST API & Security**:
  - Express REST API with MongoDB Atlas integration via Mongoose.
  - Production-ready CORS with dynamic support for Vercel preview/production domains and localhost.
  - Helmet security headers and rate limiting.

---

## Project Structure

```text
.
├── backend/
│   ├── config/database.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── icons.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vercel.json
│   ├── vite.config.js
│   └── package.json
├── render.yaml          # Render deployment configuration for backend
├── vercel.json          # Vercel deployment configuration for frontend
├── package.json
└── README.md
```

---

## Deployment Guide

### 1. Backend on Render

- **Blueprint**: Use the included `render.yaml` or create a new Web Service on Render:
  - **Root Directory**: `backend`
  - **Build Command**: `npm install && npm run build`
  - **Start Command**: `npm start`
  - **Health Check Path**: `/health`
  - **Environment Variables**:
    - `NODE_ENV`: `production`
    - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
    - `FRONTEND_URL`: `https://your-frontend.vercel.app` (or comma-separated URLs)

### 2. Frontend on Vercel

- **Vercel Settings**:
  - **Framework Preset**: Vite
  - **Root Directory**: `.` (or `frontend`)
  - **Build Command**: `npm run build`
  - **Output Directory**: `frontend/dist` (or `dist` if root directory is set to `frontend`)
  - **Environment Variables**:
    - `VITE_API_URL`: `https://your-backend-api.onrender.com`
