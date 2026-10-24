# FriendsZone

FriendsZone is a React/Vite website with an Express and MongoDB API. The
Memories and Members pages load published records from the API. Admins can
create, edit, publish, and delete records at `/admin`.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB running locally or a MongoDB Atlas connection URI

## Run locally

1. Install frontend dependencies from the project root:

   ```powershell
   npm install
   ```

2. Install backend dependencies:

   ```powershell
   npm install --prefix backend
   ```

3. From the project root, create the backend's environment file:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   notepad backend\.env
   ```

   In `backend\.env`, set `MONGODB_URI`, `JWT_SECRET` (at least 32 random
   characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters).
   Keep `.env` files private and do not commit them. The `.env.example` file is
   only a template; the backend reads `backend\.env`.

4. Create the first admin account and optionally import the current sample
   memories and members into MongoDB:

   ```powershell
   npm run create-admin --prefix backend
   npm run seed --prefix backend
   ```

   The seed command only inserts records that do not already exist. It is safe
   to run again after adding more records.

5. Start the API and frontend in separate terminals:

   ```powershell
   npm run dev --prefix backend
   npm run dev
   ```

   Open the Vite URL shown in the frontend terminal. The admin dashboard is at
   `/admin`.

The frontend defaults to `http://localhost:5000/api`. To change it, create a
root `.env` file with `VITE_API_URL=https://your-api.example.com/api`. Set the
API's `CLIENT_ORIGIN` to the frontend origin and `PUBLIC_SERVER_URL` to the
public API origin when deploying.

## Content fields

Memories include a title, description, date, image, location, album, tags,
featured flag, and published/draft status. Members include name, role, city,
bio, image, join date, private contact email, Instagram and website links, and
an active/hidden status. Member email is returned only by admin endpoints.

The admin dashboard accepts an image URL or an uploaded JPEG, PNG, WebP, or GIF
up to 5 MB. Local uploads are stored in `backend\uploads`; use persistent storage
or an object-storage provider for production deployments where local disks are
ephemeral.

## API

- `GET /api/health`
- `GET /api/memories` and `GET /api/members` (public, published/active records)
- `POST /api/auth/login`
- Admin Bearer-token routes: `/api/admin/memories`,
  `/api/admin/members`, and `/api/admin/uploads`

All admin create, update, delete, and upload routes require a valid admin
token. The login endpoint is rate limited.
