# Metaverse Platform Monorepo

Real-time 2D metaverse platform using React, Phaser, Express, and Go.

## Project Structure

- `frontend/react-client`: React + TypeScript + Phaser frontend.
- `backend/express-gateway`: Express.js API gateway and signaling server.
- `backend/go-realtime-engine`: Go-based high-performance realtime engine.
- `shared/types`: Common TypeScript interfaces.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Go (v1.20+)
- npm

### Installation

```bash
npm install
```

### Running Locally

To start all services (Frontend, Express, and Go) concurrently:

```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Express Gateway: [http://localhost:3000](http://localhost:3000)
- Go Engine: [http://localhost:8080](http://localhost:8080)
