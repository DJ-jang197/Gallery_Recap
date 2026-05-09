# Siel: Digital Biographer

**Siel** is a "Privacy-First" digital biography platform designed to ghostwrite life journals by synthesizing local photo metadata and user sentiment reflections. It creates a cohesive narrative of your journey while ensuring your binary data never leaves your local environment.

## Project Vision
The core philosophy of Siel is **Privacy + Serenity**. 
- **Privacy-First:** Photo metadata is extracted in-memory and discarded immediately. No raw images are stored or uploaded.
- **Cadence-Based:** Users choose between a **Two-Week Sprint** (granular, day-to-day focus) or a **Monthly Recap** (thematic, macro arcs).

---

## Architecture
Siel is a polyglot monorepo consisting of three specialized modules:

### 1. Identity Service (`/Auth`)
- **Stack:** Node.js, Fastify, TypeScript, Argon2.
- **Role:** Handles secure authentication, JWT issuance, and JWKS publishing.
- **Design:** Implements a minimalist, high-contrast UI for secure login and cadence selection.

### 2. Metadata Kernel (`/Siel_Spring`)
- **Stack:** Java 17, Spring Boot, Maven Wrapper.
- **Role:** Bulk EXIF metadata extraction (GPS, timestamps).
- **Logic:** Uses `ParallelStream` for high-efficiency processing and clusters data into time-bound buckets.

### 3. Sentiment & UI (`/Siel_React`)
- **Stack:** React, Vite, Vanilla CSS.
- **Role:** The primary user interface.
- **Features:** 
  - A sleek 1-5 star survey (Energy, Social, Stress).
  - **Aesthetic:** "Peach Skyline" — a serene, card-based light-mode theme.

---

## Installation & Setup

### 1. Security Configuration
Before running the services, you must configure your environment:
- **Root `.env`**: Set `GEMINI_API_KEY` with a valid key from Google Cloud.
- **Auth `.env`**: Set a strong `COOKIE_SECRET` (min 32 chars).
- **Spring `application.properties`**: Optionally set `SIEL_KERNEL_BEARER_TOKEN` for API protection.

### 2. Compilation
Compile the entire suite with a single command from the root:

```bash
npm run install:all
npm run build:all
```

### 3. Running Services
Start individual components:
- **Auth:** `npm run dev:auth`
- **Frontend:** `npm run dev:react`
- **Kernel:** `npm run dev:spring`

---

## Security & Privacy Notes
- **Data Locality:** Raw photo binaries never leave your machine.
- **AI Processing:** Siel uses the Gemini API for multimodal synthesis. While raw photos are not uploaded, base64-encoded visual context and metadata are sent to Google's generative AI services over encrypted HTTPS.
- **Auth Security:** Implements Argon2id hashing, RS256 JWT signing, refresh token rotation, and constant-time token verification to prevent timing attacks.

---
<!-- *Created with care by Antigravity.* -->
