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
