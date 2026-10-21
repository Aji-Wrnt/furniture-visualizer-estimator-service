# Custom Furniture 3D Visualizer and Parametric Cost Estimator

A standalone microservice designed for custom furniture carpentry workflows. It provides real-time parametric 3D visualization, universal camera passthrough (AR view) with ground-plane alignment, dynamic Bill of Materials (BOM) cost estimation, and standardized order payload handoff for e-commerce checkout integration.

---

## Overview

The microservice bridges the gap between customer design customization and carpentry manufacturing specifications. Users can select base models, configure dimensions (width, height, depth), customize shelf divisions, doors, wood materials, and finishing types, and preview the design in real-time.

The application supports both desktop and mobile web environments, allowing customers to view custom furniture positioned inside their physical rooms using device cameras.

---

## Core Capabilities

### 1. Parametric 3D Visualization and Model Loading
- Procedural Three.js geometry construction based on real-world dimensions (in centimeters).
- Dynamic internal partition calculation based on user-defined shelf slots.
- Optional single or double-leaf door generation with metallic hardware.
- Support for external glTF/GLB 3D assets with procedural fallback.

### 2. Universal Camera Passthrough (AR Mode)
- Compatible with mobile rear cameras (`facingMode: ideal 'environment'`) and laptop webcams.
- Transparent canvas overlay blending WebGL rendering with real-time video stream.
- Contact shadow generation using radial occlusion maps to ground objects visually on physical floor planes.
- Viewport perspective calibration (~22-degree downward tilt at 1.4m standing eye height) preventing objects from floating during depth translation.

### 3. Spatial Manipulation Controls
- Split-thumb ergonomic layout optimized for mobile touchscreens:
  - Left controller: 4-directional D-Pad for planar floor movement (X and Z axes) and origin reset.
  - Left elevation toggles: Manual vertical positioning (+Y / -Y) for placing furniture on tables, platforms, or wall mountings.
  - Right controller: Dedicated stepped rotation buttons.
- Full 2-axis direct touch and mouse drag rotation (unclamped yaw and pitch).
- Touch hitboxes expanded via CSS pseudo-elements to meet touch target guidelines (48x48px effective target).

### 4. Real-time BOM and Cost Calculation Engine
- Physical safety limits validation (minimum and maximum dimensions per furniture category).
- Area calculations for structural wood panels and surface finishing with a standardized 15% fabrication wastage factor.
- Assembly hardware and structural fittings pricing.
- Category-based carpentry production labor calculation.
- Optional on-site assembly and installation service calculation.

### 5. Composite Snapshot and Image Export
- Single-pass composite rendering merging the active camera feed with the 3D WebGL buffer on an offscreen canvas.
- Correct aspect ratio cropping matching the camera viewport (`object-fit: cover`).
- Direct file download to device storage (`.png`) and Base64 storage in database records for order history display.

### 6. Inter-Service Handoff Contract
- Dedicated endpoint (`GET /api/furniture/configurations/:id/order-payload`) allowing parent e-commerce platforms to consume clean, pre-calculated furniture order specifications without processing raw 3D mesh data.

---

## System Architecture

```
+------------------------------------------------------------------+
|                       Client Application                         |
|              React 19 + Vite + Three.js (@port 5173)              |
|   - Storefront Catalog View                                      |
|   - 3D Studio & Universal Camera AR Pass-through                 |
|   - Saved Orders Dashboard                                       |
+---------------------------------+--------------------------------+
                                  |
                        HTTP / REST API Requests
                                  |
+---------------------------------v--------------------------------+
|                     Backend API Microservice                     |
|                 Node.js (Express, ES Modules)                    |
|   - Input Validation & Category Constraints                      |
|   - Parametric BOM & Labor Cost Calculator                       |
|   - Order Payload Contract Serializer                            |
+---------------------------------+--------------------------------+
                                  |
                          PostgreSQL Driver (pg)
                                  |
+---------------------------------v--------------------------------+
|                        Database Service                          |
|                       PostgreSQL 16 Engine                       |
|   - catalog_furniture (base models, dimensions, labor base)      |
|   - materials (raw lumber, sheet goods, HPL, coatings)           |
|   - custom_configurations (user specs, snapshots, totals)        |
+------------------------------------------------------------------+
```

---

## Tech Stack

- **Backend:** Node.js (v20+), Express 5, `pg` (node-postgres), dotenv, cors
- **Frontend:** React 19, Vite 8, Three.js, CSS3 (Mobile-first responsive layout)
- **Database:** PostgreSQL 16 with `uuid-ossp` extension
- **Containerization:** Docker, Docker Compose

---

## API Reference

Base URL: `http://localhost:5000/api/furniture`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health check and database connectivity confirmation |
| `GET` | `/api/furniture/catalog` | Retrieves available furniture base models and materials list |
| `POST` | `/api/furniture/estimate` | Calculates real-time cost breakdown from dimensional parameters |
| `POST` | `/api/furniture/configurations` | Saves configured furniture specifications and snapshot to database |
| `GET` | `/api/furniture/configurations` | Retrieves recent saved configurations for dashboard history |
| `GET` | `/api/furniture/configurations/:id/order-payload` | Returns serialized order payload for external platform checkout |

### Sample Payload: Cost Estimation Request

`POST /api/furniture/estimate`

```json
{
  "furnitureId": "35b964ee-4b73-45b6-b3dd-ef1e3943d7e4",
  "baseMaterialId": "f9991722-4ad1-48c0-96a0-ad33192a3fe8",
  "finishingMaterialId": "faf5f757-2bbb-48cf-91da-14caa0af0ef0",
  "widthCm": 120,
  "heightCm": 200,
  "depthCm": 60,
  "shelvesCount": 4,
  "hasDoor": true,
  "doorType": "DOUBLE",
  "withInstallationService": true
}
```

### Sample Response: Inter-Service Order Payload

`GET /api/furniture/configurations/:id/order-payload`

```json
{
  "status": "success",
  "data": {
    "itemType": "CUSTOM_FURNITURE",
    "configurationId": "c47e8b61-9c60-4b13-81a9-b68d6d5ef311",
    "title": "Lemari Pakaian Minimalis Modern",
    "dimensions": {
      "widthCm": 120,
      "heightCm": 200,
      "depthCm": 60
    },
    "specifications": {
      "baseMaterial": "Plywood / Multiplek 18mm (Grade A)",
      "finishing": "HPL Doff Standard (Taco/Carta)",
      "shelves": 4,
      "door": "DOUBLE",
      "finishColorHex": "#8B5A2B",
      "requiresInstallation": true
    },
    "previewImageUrl": "data:image/png;base64,...",
    "pricing": {
      "materialCost": 2185000,
      "laborCost": 810000,
      "totalPrice": 2995000
    },
    "createdAt": "2026-10-21T08:30:00.000Z"
  }
}
```

---

## Containerization

The microservice is fully containerized using multi-container Docker Compose.

### Docker Structure
- **`Dockerfile`**: Builds a minimal Node.js 20 production container based on Alpine Linux (~50MB). Implements layer caching, runs under an unprivileged `node` user, and includes health check monitoring.
- **`.dockerignore`**: Excludes local dependencies, secrets, client files, and logs from entering the production build image.
- **`docker-compose.yml`**: Coordinates the Express API and PostgreSQL 16 services over an isolated bridge network with volume persistence and health dependency gating.
- **`docker/init.sql`**: Automatically sets up the database schema and seeds initial furniture catalog items and materials upon first container boot.

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm (for local setup)
- Docker and Docker Compose (for containerized setup)
- PostgreSQL 16 (if running database locally)

### Option 1: Running with Docker Compose (Recommended)

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd projek5_visualizationFurniture
   ```

2. Create your `.env` configuration file from the template:
   ```bash
   cp .env.example .env
   ```

3. Launch the full microservice stack (API and PostgreSQL):
   ```bash
   docker compose up -d --build
   ```

4. Verify service status:
   ```bash
   docker compose ps
   ```

5. Access endpoints:
   - Backend API: `http://localhost:5000/health`
   - Database: Accessible via `localhost:5432`

6. To stop all services:
   ```bash
   docker compose down
   ```

---

### Option 2: Running Locally (Manual Development Setup)

#### 1. Database Setup
Ensure PostgreSQL is active, create the database, and execute the schema:
```bash
psql -U postgres -c "CREATE DATABASE custom_furniture_db;"
psql -U postgres -d custom_furniture_db -f docker/init.sql
```

#### 2. Backend Setup
1. Install dependencies in the root directory:
   ```bash
   npm install
   ```

2. Configure `.env` with your local database credentials:
   ```env
   PORT=5000
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=custom_furniture_db
   ```

3. Start the backend service:
   ```bash
   npm run dev
   ```

#### 3. Frontend Client Setup
1. Open a second terminal, navigate to the client folder, and install dependencies:
   ```bash
   cd furniture-client
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev -- --host
   ```

3. Open `http://localhost:5173` in your browser.

---

## Mobile Camera Testing

To test AR camera passthrough on physical smartphone devices connected to the same local network:

1. Locate your machine's local IP address (e.g., `192.168.1.x`).
2. Run Vite with network exposure enabled (`npm run dev -- --host`).
3. For secure camera access on Android Chrome without HTTPS errors, you can use tunneling:
   ```bash
   npx localtunnel --port 5173
   ```
4. Open the generated `https://*.loca.lt` URL on your mobile device. Vite is pre-configured with `allowedHosts: true` and an internal API proxy routing `/api` traffic seamlessly to backend port 5000.

---

## License

This project is licensed under the ISC License.
