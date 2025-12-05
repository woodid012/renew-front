# Vercel Deployment Guide for Frontend

This guide covers deploying the Next.js frontend to Vercel.

## Prerequisites

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

## Deployment Steps

### 1. Configure Environment Variables

Before deploying, set up environment variables in Vercel:

- `MONGODB_URI` - Your MongoDB connection string (for direct MongoDB access)
- `MONGODB_DB` - Your database name
- `NEXT_PUBLIC_BACKEND_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app`)
- `LOCAL_BACKEND_URL` - (Optional, only for local development)

You can set these via:
- Vercel Dashboard: Project Settings → Environment Variables
- Or via CLI: `vercel env add NEXT_PUBLIC_BACKEND_URL`

### 2. Deploy to Vercel

From the `renew-front` directory:

```bash
vercel
```

For production deployment:

```bash
vercel --prod
```

### 3. Connect to Backend

After deploying both frontend and backend:

1. Get your backend URL from Vercel dashboard
2. Update `NEXT_PUBLIC_BACKEND_URL` in frontend's Vercel environment variables
3. Redeploy the frontend or wait for automatic redeployment

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `vercel.json` - Vercel configuration (function timeouts, etc.)
- `next.config.js` - Next.js configuration

## Important Notes

1. **API Routes**: The frontend has API routes that proxy to the backend:
   - `/api/run-model` - Proxies to backend `/api/run-model`
   - `/api/run-sensitivity` - Proxies to backend `/api/sensitivity`

2. **Function Timeouts**: API routes are configured with 300-second (5 minute) timeout for long-running calculations.

3. **Environment Variables**: 
   - `NEXT_PUBLIC_*` variables are exposed to the browser
   - Other variables are server-side only
   - Never commit `.env.local` files (already in `.gitignore`)

4. **Backend Connection**:
   - In development: Uses `LOCAL_BACKEND_URL` or defaults to `http://localhost:10000`
   - In production: Uses `NEXT_PUBLIC_BACKEND_URL` or defaults to `https://backend-renew.onrender.com`

## Troubleshooting

### Backend Connection Issues
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Check CORS settings on backend
- Verify backend is deployed and accessible

### Build Errors
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript/ESLint errors

### Environment Variables Not Working
- Ensure variables are set in Vercel dashboard
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

## Local Testing

Test the Vercel setup locally:

```bash
vercel dev
```

This will start a local server that mimics Vercel's environment and uses Vercel environment variables.


