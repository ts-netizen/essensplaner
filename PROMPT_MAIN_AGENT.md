# MISSION: ESSENSPLANER & SMART SHOPPING PWA

Du bist der leitende Software-Architekt und Main-Agent. Deine Aufgabe ist es, die vollständige App "Essensplaner" gemäss SPEZIFIKATION.md mit spezialisierten Sub-Agents umzusetzen.

## SYSTEM-VORGABEN
- Stack: React 19 (TypeScript, Vite, Tailwind CSS, shadcn/ui, PWA), Node.js (TypeScript, Fastify/Express), Firebase (Auth, Firestore, Storage), Google Cloud Run Deployment.
- Repository: Monorepo mit npm Workspaces (`apps/web`, `apps/server`, `packages/shared`).

## SUB-AGENTEN AUFGABEN

### 1. Sub-Agent: Backend & Ingestion Engineer (apps/server)
- Implementiere `/api/recipes/scrape` (Schema.org JSON-LD + Gemini 1.5 Flash Fallback).
- Implementiere `/api/recipes/parse-dictation` (LLM Rohtext-Parsing).
- Implementiere `/api/nutrition/:canonicalId` (Wissens-Cache auf Firestore).
- Erstelle das Multi-Stage Dockerfile (Port 8080, serviert API und statisches Frontend).

### 2. Sub-Agent: Data Architect & Security Engineer (Firebase)
- Richte Firebase Auth, Firestore und Storage ein.
- Implementiere Firestore Schemas in `packages/shared`.
- Schreibe Firestore Security Rules (Haushalts-Isolation, Freunde-Read-Only, Einkaufslisten-Sperre).
- Aktiviere Offline-Persistenz im Web SDK.

### 3. Sub-Agent: Algorithm & Planning Engineer
- Heuristischer Wochenplan-Algorithmus: 7-Tage x (Mittag/Abend), 7-Tage-Cooldown, Slot-Eignung (<= 30 Min mittags), Pinning/Locking und selektives Re-Rolling.
- Einkaufslisten-Generator: Pantry-Check ("Never Out of Stock" Filter), Mengenkonsolidierung, Dual-Source Handling (Plan vs. Manuell).

### 4. Sub-Agent: Frontend & Mobile UX Engineer (apps/web)
- React 19 PWA mit Workbox Service Worker.
- Screens: Dashboard, Wochenplaner (Pin/Shuffle), Live-Einkaufsliste mit Realtime Firestore `onSnapshot`, Rezeptkatalog mit Detailansicht & Foto-Upload, Ingestion-Modal (URL Paste & Web Speech API Diktat), Social-Feed.
- Responsives Layout: Mobile-First Einhand-Bedienung; Multi-Column auf Desktop/iPad.

### 5. Sub-Agent: DevOps & CI/CD Engineer
- GitHub Actions Workflow (`.github/workflows/deploy.yml`) für automatisiertes Bauen und Deployment auf Google Cloud Run via Workload Identity Federation.

## DEFINITION OF DONE
- TypeScript Strict Mode ohne Fehler.
- Offline-Fähigkeit der Einkaufsliste im Supermarkt verifiziert.
- Echtzeit-Synchronisation zwischen zwei Clients ohne Page-Refresh verifiziert.
- Docker-Container startet fehlerfrei auf Port 8080.
