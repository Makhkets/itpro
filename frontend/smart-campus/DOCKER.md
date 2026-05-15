# Docker deployment

Production container builds the Vite app and serves it with nginx.
The app calls `/api/v1` by default, and nginx proxies `/api/*` to `BACKEND_URL`.

## Quick start

```bash
cp .env.example .env
docker compose up -d --build
```

Frontend will be available on `http://localhost:3000`.

## Server settings

Create or update `.env` near `docker-compose.yml`:

```env
FRONTEND_PORT=3000
VITE_API_BASE_URL=/api/v1
BACKEND_URL=http://host.docker.internal:8080
```

If the backend runs in another Docker Compose project/network, set `BACKEND_URL`
to the backend service URL, for example:

```env
BACKEND_URL=http://backend:8080
```

Then run:

```bash
docker compose up -d --build
```

To view logs:

```bash
docker compose logs -f frontend
```
