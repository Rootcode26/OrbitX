# OrbitX

OrbitX is a space situational awareness and satellite tracking platform built for the Smart India Hackathon (SIH) 2026. The platform tracks real-time satellite positions, calculates future orbital propagation paths, and performs conjunction screening to identify potential close-approach risks between space objects.

The system uses a containerized multi-service architecture with a Next.js web application, a Node.js API and data pipeline, and a high-performance Python astrodynamics compute engine.

---

## System Architecture

OrbitX consists of three primary services configured to run independently or together via Docker Compose:

*   **Web Frontend (`web/`):** A Next.js dashboard providing interactive 3D geospatial views, satellite lookup, and conjunction risk alerts.
*   **API & Data Pipeline (`node-backend/`):** A Node.js and TypeScript service that manages database records, schedules periodic TLE data fetching, handles user authentication, and coordinates requests with the compute engine.
*   **Orbital Mechanics Engine (`pythonbackend/`):** A FastAPI-powered Python service that runs SGP4 orbital propagation algorithms, coordinate transformations (ECI, ECEF, Geodetic), and vector-distance conjunction calculations.
*   **Database & Cache:** PostgreSQL for relational entity storage (satellites, user details, orbit state vectors) and Redis for task queues and caching.

---

## Tech Stack & Libraries

### Web Frontend (`web/`)
*   **Framework:** Next.js (App Router), React, TypeScript
*   **Styling:** Tailwind CSS, PostCSS, Lucide React
*   **State & Data Fetching:** React Query / Axios

### Core API (`node-backend/`)
*   **Runtime:** Node.js, TypeScript, Express.js
*   **Database & ORM:** PostgreSQL, `node-pg-migrate`, `pg`
*   **Validation & Logging:** Zod, Pino, Pino-pretty
*   **Task Scheduling:** Node-cron / BullMQ
*   **Package Manager:** pnpm (Workspace configuration)

### Scientific Compute Engine (`pythonbackend/`)
*   **Framework:** FastAPI, Uvicorn, Pydantic
*   **Astrodynamics & Math:** SGP4, Skyfield / Astropy, NumPy, SciPy
*   **Testing:** Pytest

---

## Project Structure

```text
OrbitX/
├── data/                       # Two-Line Element (TLE) datasets & satellite ephemerides
│   ├── iss.tle
│   ├── noaa15.tle
│   └── satellites.json
├── node-backend/               # Core Node.js/TypeScript API & orchestration
│   ├── src/
│   │   ├── Validation/         # Request schema validation models
│   │   ├── config/             # Database, logging, and environment configuration
│   │   ├── constants/          # Static system constants
│   │   ├── db/                 # Database connection & migration scripts
│   │   ├── health/             # Service health checks
│   │   ├── helpers/            # Shared utility functions
│   │   ├── modules/satellites/ # Satellite ingestion & routing logic
│   │   ├── routes/             # REST API endpoint definitions
│   │   ├── scheduler/          # Automated background TLE ingestion tasks
│   │   └── index.ts            # Service entry point
│   ├── package.json
│   └── pnpm-workspace.yaml
├── pythonbackend/              # Python orbital mechanics and screening service
│   ├── api/                    # FastAPI route definitions
│   ├── core/                   # Core math, physics, and model configs
│   ├── schemas/                # Pydantic data schemas
│   ├── services/               # Propagation & conjunction algorithms
│   ├── test/                   # Python unit and integration tests
│   └── main.py                 # FastAPI entry point
├── tests/                      # Conjunction screening & propagation test suites
├── web/                        # Next.js frontend user interface
│   ├── app/                    # Next.js App Router pages and layouts
│   ├── public/                 # Static assets, SVG icons, and models
│   ├── package.json
│   └── next.config.ts
├── Dockerfile                  # Container build instructions
├── docker-compose.yml          # Multi-container orchestration setup
└── pyproject.toml              # Python project metadata and dependencies
```

---

## Getting Started

### Prerequisites

Make sure the following tools are installed locally:

*   **Node.js:** `>= 20.x`
*   **pnpm:** `>= 9.x`
*   **Python:** `>= 3.10`
*   **PostgreSQL:** `>= 15.x`
*   **Docker & Docker Compose** (Optional, for containerized execution)

---

### Local Development Setup

#### 1. Clone Repository

```bash
git clone [https://github.com/Rootcode26/OrbitX.git](https://github.com/Rootcode26/OrbitX.git)
cd OrbitX
```

#### 2. Configure Database & Node Backend

```bash
cd node-backend
cp .env.example .env
pnpm install
```

Configure your local `.env` variables with your PostgreSQL credentials:

```env
NODE_ENV=development
PORT=5000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=orbitx
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/orbitx
PINO_LOG_LEVEL=debug
```

Run database migrations and start the server:

```bash
pnpm migrate up
pnpm dev
```

#### 3. Start the Python Compute Engine

Open a new terminal window:

```bash
cd pythonbackend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows (Git Bash):
source .venv/Scripts/activate

pip install -e .
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. Start the Web Dashboard

Open a separate terminal window:

```bash
cd web
pnpm install
pnpm dev
```

The frontend application will be available at `http://localhost:3000`.

---

## Running with Docker Compose

To start the entire platform (PostgreSQL, Python backend, Node API, and Next.js frontend) with a single command:

```bash
docker-compose up --build
```

---

## Running Tests

### Python Astrodynamics Tests
```bash
pytest tests/
```

### Node.js Backend Tests
```bash
cd node-backend
pnpm test
```
