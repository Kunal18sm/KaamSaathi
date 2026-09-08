# KaamSaathi / SevaSetu

KaamSaathi (SevaSetu) is a cooperative-first local services platform. It connects customers with technicians and service workers, supports transparent service pricing, and gives cooperatives visibility into worker activity and welfare contributions.

## What it includes

- Customer service discovery, worker matching, booking and payment-flow simulation
- Technician work queue with assigned-job alerts, acceptance, completion and material billing
- Customer, worker, cooperative-admin and federation/ministry dashboards
- Distance-based invite fee and fair worker-allocation logic
- Technician availability, ratings, complaints, receipts and welfare tracking
- JWT-based login/registration, profile management and optional MongoDB persistence
- Responsive React UI with PWA/service-worker support

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Lucide React, Leaflet, Recharts |
| Backend | Node.js, Express, JWT |
| Database | MongoDB with Mongoose (optional; hybrid in-memory fallback) |
| Media | Cloudinary (optional) |

## Project structure

```text
.
├── frontend/       # Vite + React customer and workforce portals
├── backend/        # Express REST API, matching engine and data store
└── ai-service/     # Python service placeholder for future AI capabilities
```

## Run locally

Prerequisites: Node.js 18+ and npm. MongoDB is optional for local evaluation.

1. Start the backend.

   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. In another terminal, start the frontend.

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`.

The frontend proxies `/api` requests to `http://localhost:5000` during development.

## Optional environment variables

Create `backend/.env` only when these integrations are needed:

```env
PORT=5000
JWT_SECRET=replace_with_a_secure_secret
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Without `MONGODB_URI`, the application continues in its in-memory demo mode. Bookings and newly created data in that mode are cleared when the backend restarts.

## Main workflow

1. A customer registers/logs in and selects a service.
2. The matching engine filters available verified workers by trade, then ranks them using skill, distance, rating, availability and income-fairness signals.
3. The customer chooses a technician and confirms a booking.
4. The booking appears in that technician's **Live Work** queue; the worker portal polls for new assignments and shows an alert.
5. The technician accepts/completes work and can raise a material-cost request.
6. The customer can pay the final material bill and submit a rating.

## Key API routes

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Register a customer or technician |
| `POST /api/auth/login` | Log in and receive a JWT |
| `GET /api/services` | List available services |
| `POST /api/bookings/match` | Get ranked technician matches |
| `POST /api/bookings/create` | Create an assigned booking |
| `GET /api/bookings?workerId=...` | Get a technician's work queue |
| `PATCH /api/bookings/:id/status` | Accept or update job status |
| `PATCH /api/workers/:id/availability` | Update worker availability |
| `POST /api/bookings/:id/generate-bill` | Generate a material-cost request |

## Verification

Build the frontend before deployment:

```bash
cd frontend
npm run build
```

## Notes for production

- Set a strong `JWT_SECRET`; do not use the development fallback.
- Configure MongoDB so registrations and bookings survive restarts.
- Configure Cloudinary only if profile/certificate uploads are required.
- Use HTTPS and restrict CORS to the deployed frontend domain.

## License

No license has been specified yet.
