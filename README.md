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
- **Logic:** Uses `ParallelStream` for high-efficiency processing and clusters data into time-bound buckets based on the user's chosen cadence.

### 3. Sentiment & UI (`/Siel_React`)
- **Stack:** React, Vite, Vanilla CSS.
- **Role:** The primary user interface.
- **Features:** 
  - A sleek 1-5 star survey (Energy, Social, Stress).
  - Dynamic reflective prompts that change based on whether you are in a Bi-Weekly or Monthly cycle.
  - **Aesthetic:** "Peach Skyline" — a serene, card-based light-mode theme.

### 4. AI Narrator
- **Orchestration:** Gemini 1.5 Flash.
- **Synthesis:** Merges objective metadata with subjective survey scores into natural prose.
- **Logic:** Adjusts narrative scope (Granular vs. Thematic) and strictly filters out raw numerical scores for a more human journal entry.

---

## Installation & Compilation

Siel is designed to be **fully portable**. It includes a local JDK and Maven Wrapper, so you do not need to install Java or Maven on your system.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)

### 2. Unified Build
Compile the entire suite (Auth, Spring Boot, and React) with a single command from the root:

```bash
# Install all dependencies
npm run install:all

# Compile all modules into production bundles
npm run build:all
```

### 3. Running the Services
Start the individual components in separate terminal windows:
- **Auth:** `npm run dev:auth`
- **Frontend:** `npm run dev:react`
- **Kernel:** `npm run dev:spring`

---

## Security & Privacy Notes
- **API Keys:** To enable live AI synthesis, add your Gemini API Key to `Siel_Spring/src/main/resources/application.properties`.
- **Data Locality:** All photo processing is internal. The AI only receives coordinates and dates, never raw image bytes.
- **Security Logic:** Auth uses Argon2id for hashing and timing-safe verification to prevent enumeration attacks.

---
*Created with care by Antigravity.*
