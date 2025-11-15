# HawkerSG Frontend

React + Vite single-page application that surfaces hawker-centre discovery, business profile management, and account workflows for the HawkerSG platform. It consumes the FastAPI backend at `http://localhost:8001` by default.

## Requirements

- Node.js **18+** (Vite 5 requirement; Node 20 LTS recommended)
- npm 9+ (ships with Node) or another compatible package manager

## Getting started

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at http://localhost:5173 and expects the backend API to be reachable at `http://localhost:8001`. If your backend lives elsewhere, update the `API_BASE_URL` constants found in:

- `src/contexts/AuthContext.tsx`
- `src/components/StallPreview.tsx`
- `src/components/StallProfileEditor.tsx`
- `src/components/ReviewCard.tsx`
- `src/components/MenuEditor.tsx`
- `src/pages/BusinessProfile.tsx`
- `src/pages/ConsumerProfilePage.tsx`

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite in development mode with fast refresh. |
| `npm run build` | Generate a production build in `dist/`. |
| `npm run preview` | Serve the production build locally (after `npm run build`). |
| `npm run lint` | Run ESLint with the TypeScript + React configuration. |

## Project structure

```
src/
├── components/      # Header, cards, editors, and other shared UI pieces
├── contexts/        # AuthContext + DataContext (authentication state, hawker data cache)
├── pages/           # Route-level pages (Home, Search, Nearby, Hawker detail, Stall detail, Auth flows)
├── index.css        # Tailwind + global styles
├── App.tsx          # Router definition and route guards
└── main.tsx         # React root + provider wiring
```

Tailwind CSS is configured via `tailwind.config.js` and PostCSS (see `postcss.config.js`). Framer Motion powers transitions, Lucide provides icons, and React Router v7 manages navigation and modal routes (`/profile/edit`).

## Connecting to the backend

- Ensure the backend is running (`uvicorn app.main:app --reload --port 8001`).
- Confirm CORS is enabled (already configured to `*` in development).
- Image assets are fetched from the FastAPI static mounts (`/static/profiles`, `/static/business`, etc.), so the backend must have access to the seeded images in `backend/app/assets/*`.

## Production build tips

1. Run `npm run build` to emit the optimized bundle.
2. Serve the generated `dist/` directory via any static host or configure Vite's preview server (`npm run preview`).
3. Remember to set the correct API base URL (through environment variables or config constants) before deploying.
