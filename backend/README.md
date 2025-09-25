# MediConnect Backend

Node.js/Express API providing auth, user profiles, appointments, medical records upload, and health alerts.

## Requirements
- Node.js 18+

## Setup
```
cd backend
npm install
npm run dev
```

.env (optional):
```
PORT=4000
JWT_SECRET=change_me
```

## Endpoints
- POST /api/auth/register { name, email, password, phone?, role?, gender?, dob? }
- POST /api/auth/login { email, password }
- GET /api/users/:id (auth)
- PATCH /api/users/:id (auth)
- GET /api/appointments (auth)
- POST /api/appointments { userId, doctorId, date, time, reason? } (auth)
- PATCH /api/appointments/:id (auth)
- DELETE /api/appointments/:id (auth)
- POST /api/records/upload multipart/form-data field "file" (auth)
- GET /api/alerts (auth)
 - GET /api/users/by-email/:email (auth)
 - GET /api/availability?doctorId=<uuid> (auth)
 - POST /api/availability { date, time, notes? } (auth; doctor)
 - DELETE /api/availability/:id (auth; owner)

Uploads are served at /uploads/<filename>.

Data is stored as JSON files in backend/data/.
