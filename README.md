# OrbitX

OrbitX is a web-based system designed to track satellites, predict their future paths, and detect potential collisions in space. This project is built as an internal hackathon submission for SIH 2026.

The system is split into three main parts: a web frontend for viewing the data, a Node.js backend for managing users and databases, and a Python engine for doing heavy physics calculations.

## Key Features

*   **Satellite Tracking:** Reads standard satellite data files to find their current location.
*   **Path Prediction:** Calculates where a satellite will be in the future.
*   **Collision Warnings:** Checks if two space objects are getting too close to each other.
*   **3D Web Interface:** Shows the satellites and their paths on a clear visual dashboard.

## Technology Stack

*   **Frontend (web):** Next.js, React, Tailwind CSS
*   **Main API (node-backend):** Node.js, PostgreSQL, Pino
*   **Math Engine (pythonbackend):** Python, FastAPI
*   **Tools:** pnpm, pip, Git

## Prerequisites

Before you start, make sure you have these installed on your system:

*   Node.js (v18 or higher)
*   pnpm (Node package manager)
*   Python (v3.10 or higher)
*   PostgreSQL 

## Installation and Setup

Follow these steps to run the project on your local computer.

### 1. Clone the Repository

```bash
git clone [https://github.com/Rootcode26/OrbitX.git](https://github.com/Rootcode26/OrbitX.git)
cd OrbitX
```

### 2. Set Up the Node.js Backend

Open a terminal and navigate to the node backend folder:

```bash
cd node-backend
pnpm install
```

Copy the example environment file and fill in your database details:

```bash
cp .env.example .env
```
Update the `.env` file with your local PostgreSQL username, password, and database name.

### 3. Set Up the Python Backend

Open a new terminal window and navigate to the python backend folder:

```bash
cd pythonbackend
python -m venv .venv
source .venv/Scripts/activate
pip install -r pyproject.toml
```

### 4. Set Up the Web Frontend

Open a third terminal window and navigate to the web folder:

```bash
cd web
pnpm install
```

## Folder Structure

*   **data/**: Contains the raw satellite tracking files (like .tle files).
*   **node-backend/**: The main server that talks to the database and the frontend.
*   **pythonbackend/**: The calculation server that handles the math and physics rules.
*   **web/**: The user interface code.
