# Deployment Guide

This guide covers how to run the backend locally and deploy to Vercel.

## Local Development Setup

### Running the Python Backend Locally

1. **Navigate to the backend directory:**
   ```bash
   cd ../backend-renew
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `backend-renew` directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB=your_database_name
   PORT=10000
   ```

4. **Run the Flask backend:**
   ```bash
   python app.py
   ```
   
   The backend will start on `http://localhost:10000`

5. **In a separate terminal, run the Next.js frontend:**
   ```bash
   cd renew-front
   npm run dev
   ```

6. **The frontend will automatically detect local development and proxy requests to the local backend.**

### How It Works Locally

- When running in development mode (`npm run dev`), the frontend uses Next.js API routes (`/api/run-model`, `/api/run-sensitivity`)
- These API routes proxy requests to your local Python backend on `http://localhost:10000`
- You can override the backend URL by setting `LOCAL_BACKEND_URL` in your `.env.local` file

## Vercel Deployment

### Option 1: Use External Backend (Recommended)

For production, it's recommended to keep your Python backend on a separate service (like Render, Railway, or AWS) because:

- Vercel serverless functions have execution time limits (10s Hobby, 60s Pro, 300s Enterprise)
- Complex financial calculations may exceed these limits
- Better separation of concerns

**Setup:**

1. Deploy your Python backend to Render/Railway/AWS/etc.
2. Set the `NEXT_PUBLIC_BACKEND_URL` environment variable in Vercel:
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add: `NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com`

3. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

The frontend will automatically use the remote backend URL in production.

### Option 2: Vercel Serverless Functions (For Light Calculations)

If your calculations are quick enough, you can use Vercel's serverless functions. However, note the time limits mentioned above.

**Setup:**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Create a Python runtime file** (if needed for direct Python execution):
   ```python
   # api/run-model-python/index.py
   # This would require setting up Python runtime in Vercel
   ```

3. **The existing Next.js API routes will work**, but they proxy to an external backend.

### Environment Variables for Vercel

Set these in your Vercel project settings:

- `MONGODB_URI` - Your MongoDB connection string
- `MONGODB_DB` - Your database name
- `NEXT_PUBLIC_BACKEND_URL` - Your production backend URL (if using external backend)
- `LOCAL_BACKEND_URL` - Only needed for local development (optional)

### Recommended Architecture

```
┌─────────────────┐
│   Vercel        │
│   (Frontend)    │
│   Next.js       │
└────────┬────────┘
         │
         │ API Calls
         │
┌────────▼────────┐
│   Render/       │
│   Railway/      │
│   AWS           │
│   (Backend)     │
│   Python/Flask  │
└─────────────────┘
         │
         │
┌────────▼────────┐
│   MongoDB       │
│   Atlas         │
└─────────────────┘
```

## Troubleshooting

### Backend not connecting locally

1. **Check if backend is running:**
   ```bash
   curl http://localhost:10000/
   ```

2. **Check environment variables:**
   - Ensure `LOCAL_BACKEND_URL` is set correctly in `.env.local`
   - Default is `http://localhost:10000`

3. **Check CORS settings:**
   - The Flask backend has CORS enabled for all origins
   - If issues persist, check `app.py` CORS configuration

### Vercel deployment issues

1. **Check function timeout:**
   - Vercel Hobby plan: 10 seconds max
   - Vercel Pro plan: 60 seconds max
   - Consider using external backend for long-running calculations

2. **Check environment variables:**
   - Ensure all required env vars are set in Vercel dashboard
   - Redeploy after adding new environment variables

3. **Check logs:**
   ```bash
   vercel logs
   ```

## Development Workflow

1. **Start backend:**
   ```bash
   cd backend-renew
   python app.py
   ```

2. **Start frontend (in another terminal):**
   ```bash
   cd renew-front
   npm run dev
   ```

3. **Access the app:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:10000`

4. **Run model calculations:**
   - Navigate to "Run Model" page
   - Click "Run Base Model"
   - The frontend will automatically use the local backend





