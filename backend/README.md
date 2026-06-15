# TerraSense Backend

Express REST API for the TerraSense platform. Uses SQLite for relational storage and JSON Web Tokens (JWT) for secure authentication.

## Tech Stack
- **Framework**: Express.js
- **Database**: SQLite (using `sqlite3` driver)
- **Token Handling**: `jsonwebtoken`
- **Crypto**: `bcryptjs` for hashing password credentials

## Configuration
Before running, copy `.env.example` to `.env`:
```bash
PORT=5000
JWT_SECRET=super_secret_carbon_zero_token_key_123!
DATABASE_PATH=./database.sqlite
```

## Available Scripts
- `npm start`: Boot the Express listener using node.
- `npm run dev`: Boot development server using `nodemon` to watch file edits.
- `npm test`: Launch unit tests and endpoint integration tests using Node's native test runner (`node --test`).

## Test Configurations
The test files reside in `tests/`:
- `tests/calculator.test.js`: Validates carbon calculation coefficients (transport, energy, diet, waste, water, purchases).
- `tests/api.test.js`: Fires simulated HTTP requests against server endpoints and verifies correct JSON bodies.
