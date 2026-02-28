# e-testhub API

A Node.js/Express + MongoDB API for managing users, classes, courses, subjects, exams, questions, schedules, and submissions.

## Prerequisites

- Node.js >= 18
- npm >= 9 (bundled with Node)
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)
- Git

## Getting Started

### 1) Clone repository

```bash
git clone https://github.com/QuynYang/e-testhub.git
cd e-testhub
```

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create a `.env` file in the project root:

```bash
# Server
PORT=3000

# Auth
JWT_SECRET=your-strong-secret

# Database
MONGODB_URI=mongodb://localhost:27017/e_testhub
```

Notes:

- Never commit your real `.env`. Keep `.env` in local only.
- If you use MongoDB Atlas, set `MONGODB_URI` to your SRV connection string.

### 4) Start the API

Development with hot-reload (nodemon):

```bash
npm run dev
```

Production:

```bash
npm start
```

Default base URL: `http://localhost:${PORT}` (3000 if not set).

## Project Structure

```
src/
  config/db.js             # Mongo connection
  middlewares/             # auth, error handler
  models/                  # Mongoose models (User, Class, Course, ...)
  routes/                  # Express routers per resource
  server.js                # App bootstrap
```

## Routes Summary

- GET `/` → Health check
- `POST /api/auth/register` → Register user (admin/teacher/student)
- `POST /api/auth/login` → Login, returns `{ token }`
- Authenticated resources (require Bearer token):
  - `GET /api/users`
  - `GET /api/classes`
  - `GET /api/courses`
  - `GET /api/subjects`
  - `GET /api/exams`
  - `GET /api/questions`
  - `GET /api/schedules`
  - `GET /api/submissions`

Note: Current implementation exposes simple `GET /` for each resource as a smoke test. Extend to full CRUD as needed.

## Authentication

- Obtain JWT via `POST /api/auth/login`.
- Send header `Authorization: Bearer <token>` for all protected endpoints.

Example login request (JSON):

```json
{ "username": "admin1", "password": "P@ssw0rd!" }
```

Response:

```json
{ "token": "<jwt>" }
```

## Postman Setup

1. Create an Environment with variables:
   - `baseUrl` = `http://localhost:3000`
   - `token` = (leave empty initially)
2. Create a request `POST {{baseUrl}}/api/auth/login` with body:

```json
{ "username": "admin1", "password": "P@ssw0rd!" }
```

3. In the Tests tab of that request, save the token:

```javascript
const data = pm.response.json();
if (data.token) {
  pm.environment.set("token", data.token);
}
```

4. Set Collection-level Authorization: Type = Bearer Token; Token = `{{token}}`.
5. Create requests for each resource:
   - `GET {{baseUrl}}/api/users`
   - `GET {{baseUrl}}/api/classes`
   - `GET {{baseUrl}}/api/courses`
   - `GET {{baseUrl}}/api/subjects`
   - `GET {{baseUrl}}/api/exams`
   - `GET {{baseUrl}}/api/questions`
   - `GET {{baseUrl}}/api/schedules`
   - `GET {{baseUrl}}/api/submissions`

## First Admin / Test Users

Use register endpoint to create an initial admin account:

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "admin1",
  "password": "P@ssw0rd!",
  "fullName": "Admin One",
  "role": "admin"
}
```

Then login to obtain token.

## Environment & Secrets

- `.env` should include at least: `PORT`, `JWT_SECRET`, `MONGODB_URI`.
- Consider providing a `README` section or `.env.example` for team members.

## Scripts

- `npm run dev` → start with nodemon
- `npm start` → start with node

## Contribution Guide

- Branch from `main` → `feature/<short-description>`
- Commit style: conventional commits (e.g., `feat: add subject CRUD`)
- Open PRs to `main`; request review from teammates

## Troubleshooting

- 401 Unauthorized: missing/invalid Bearer token; confirm `JWT_SECRET` matches.
- Mongo connection errors: verify `MONGODB_URI` and network access.
- Port already in use: change `PORT` or free the port.

## License

ISC
