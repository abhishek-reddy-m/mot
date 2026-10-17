# Motel Booking System

A full-stack motel booking website built with Next.js, TypeScript, and PostgreSQL.

## Features

- **Admin Panel**: Property management, room type management, booking management, user management
- **Customer Interface**: Property browsing, room booking, user account management
- **Authentication**: Multi-level authentication with role-based access control
- **Database**: PostgreSQL with Prisma ORM for data management

## Production Deployment Instructions

### Prerequisites

- A PostgreSQL database (Render Postgres service recommended)
- Node.js 18+ and npm

### Steps for Deployment

1. **Clone the repository**
   ```
   git clone <repository-url>
   cd motel-booking
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@host:port/database"
   NEXTAUTH_URL="https://your-app-domain.com"
   NEXTAUTH_SECRET="a-long-secret-value"
   ```

3. **Deployment to Render**

   - Connect your GitHub repository to Render
   - Use the following settings for your Web Service:
     - Build Command: `bash enhanced-cleanup.sh && npm install --production=false && npm run build`
     - Start Command: `npm start`
   - Add the required environment variables in the Render dashboard

4. **Database Setup**

   - Create a PostgreSQL database
   - Apply migrations using Prisma:
     ```
     npx prisma migrate deploy
     ```
   - Seed the database:
     ```
     npm run db:seed
     ```

5. **Verify Deployment**

   - After deployment, check the `/api/debug/schema` endpoint to verify database connectivity
   - Log in with the default admin credentials (email: admin@motelbooking.com, password: see seed.js)

## Development Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up the database**
   ```
   npm run db:setup
   ```

3. **Run the development server**
   ```
   npm run dev
   ```

## Troubleshooting Deployment

If you encounter schema-related errors on Render:

1. **Check database connectivity** using the `/api/debug/schema` endpoint
2. **Verify schema migration** by checking if all expected tables exist
3. **Force a clean rebuild** by manually triggering a deployment with "Clear build cache" option

## Architecture

- **Frontend**: Next.js App Router with server and client components
- **Backend**: API routes in Next.js with proper middleware
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: NextAuth.js with JWT-based authentication

## Adding New Features

When adding new features:
1. Create migrations for any schema changes
2. Update API routes with proper error handling
3. Avoid direct column references that might not exist in production
4. Test thoroughly in a production-like environment before deploying

## Property Custom Domains

A property can serve its booking page on its own domain, such as `book.mymotel.com`. In Admin → Properties → Edit, the **Booking Page Domain** card takes the domain, shows the DNS record to add, and checks it. Once the domain points here, guests who visit it see that property's booking page. Other pages (sign-in, guest accounts, staff portals) redirect to the main site, where the session cookie lives.

1. Apply the migration (`npx prisma migrate deploy`), which adds `customDomain` to `properties`.
2. Set these environment variables on the web service:
   - `NEXT_PUBLIC_SITE_URL` (or `NEXTAUTH_URL`): the main site, e.g. `https://mot-cvjh.onrender.com`. Owners point their subdomain's CNAME at its hostname.
   - `RENDER_API_KEY` and `RENDER_SERVICE_ID` (recommended): the app then adds each domain to the Render service and waits for Render to verify it, so its TLS certificate is issued automatically. Without them, add each domain by hand in the service's Settings → Custom Domains.
   - `APP_HOSTNAMES` (optional): comma-separated extra hostnames for the main site itself. `*.onrender.com` always counts as the main site.
   - `INTERNAL_APP_URL` (optional): how the middleware reaches this server to look up domains. Defaults to `http://127.0.0.1:$PORT`.
   - `CUSTOM_DOMAIN_CNAME_TARGET` and `CUSTOM_DOMAIN_A_RECORD` (optional): override the DNS values shown to owners. The A record for root domains defaults to Render's `216.24.57.1`.
