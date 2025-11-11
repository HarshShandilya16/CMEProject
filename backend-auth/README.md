# Backend-Auth (Express + MongoDB)

This is a separate microservice that handles user authentication for Options Pro.

- Stack: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- Endpoints:
  - POST /api/auth/register
  - POST /api/auth/login
  - GET  /api/user/me (protected)

## Setup

1. Copy env file
   cp .env.example .env

2. Edit .env
   - PORT=3001
   - MONGODB_URI=mongodb://localhost:27017/optionspro (or your Mongo Atlas URI)
   - JWT_SECRET=your_secret
   - CORS_ORIGINS=http://localhost:5173

3. Install deps and run
   npm install
   npm run dev

The server will listen on http://localhost:3001

## Frontend integration
The frontend uses a persisted auth store (Zustand) and calls this service via:
- POST http://localhost:3001/api/auth/register
- POST http://localhost:3001/api/auth/login
- GET  http://localhost:3001/api/user/me

Tokens are stored client-side; sign-out simply clears the token.
