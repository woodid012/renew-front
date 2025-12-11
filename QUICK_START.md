# Quick Start Guide

## Running Locally

### 1. Start the Python Backend

Open a terminal and navigate to the backend directory:

```bash
cd ../backend-renew
python app.py
```

The backend will start on `http://localhost:10000`

### 2. Start the Next.js Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd renew-front
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Run Calculations

1. Open `http://localhost:3000` in your browser
2. Navigate to the "Run Model" page
3. Click "Run Base Model"
4. The frontend will automatically connect to your local backend

## Environment Variables

Create a `.env.local` file in the `renew-front` directory:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name
LOCAL_BACKEND_URL=http://localhost:10000
```

For the backend, create a `.env` file in the `backend-renew` directory:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=your_database_name
PORT=10000
```

## How It Works

- **Local Development**: The frontend uses Next.js API routes (`/api/run-model`) that proxy to your local Python backend
- **Production**: The frontend uses the `NEXT_PUBLIC_BACKEND_URL` environment variable to connect to your deployed backend

## Troubleshooting

### Backend not connecting?

1. Make sure the backend is running: `curl http://localhost:10000/`
2. Check the port matches (default is 10000)
3. Check your `.env.local` file has `LOCAL_BACKEND_URL=http://localhost:10000`

### CORS errors?

The Flask backend has CORS enabled. If you still see errors, check that the backend is actually running.

## Deploying to Vercel

See `DEPLOYMENT.md` for detailed instructions.






