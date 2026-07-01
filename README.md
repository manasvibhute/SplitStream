# SplitStream

SplitStream is a Splitwise-style real-time expense splitter. Users can create groups, add shared expenses, settle balances, and watch group state update live through Socket.io.

## Stack

- React, Redux Toolkit, Tailwind CSS, Vite
- Node.js, Express, Socket.io
- MongoDB with Mongoose
- JWT auth with bcrypt password hashing
- Jest tests for split and debt simplification logic
- Docker Compose and GitHub Actions CI

## Local Setup

1. Copy `.env.example` to `.env` and adjust secrets if needed.
2. Start MongoDB with `docker compose up mongo`.
3. Install dependencies with `npm install`.
4. Start both apps with `npm run dev`.

The API runs on `http://localhost:4000` and the Vite client runs on `http://localhost:5173`.

## Docker

Run the full stack with:

```bash
docker compose up --build
```

## Tests

```bash
npm test
```

The tests cover equal, percentage, and custom splits, validation errors, and the greedy debt simplification algorithm.
