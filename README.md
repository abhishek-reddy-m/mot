# Motel Booking System

A comprehensive full-stack motel booking website built with Next.js, TypeScript, PostgreSQL, and modern web technologies.

## Features

### Customer Features
- 🏨 Browse available properties with detailed information
- 📅 Real-time room availability checking
- 💳 Secure booking system
- 👤 User account management
- 📱 Responsive mobile-friendly design
- ⭐ Property reviews and ratings

### Admin Features
- 🏢 Property management (add, edit, delete)
- 🛏️ Room type management with pricing
- 📊 Booking management and status tracking
- 👥 User management
- 📈 Analytics and reporting dashboard
- 📸 Photo upload and management

### Security & Authentication
- 🔐 Multi-level authentication (Customer/Admin)
- 🛡️ Role-based access control
- 🔒 Secure password hashing
- 🚫 Input validation and sanitization

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI, Lucide Icons
- **File Upload**: Cloudinary (configured)
- **Styling**: Tailwind CSS with custom design system

## Database Schema

The application uses a relational database with the following main entities:

- **Users** - Customer and admin accounts
- **Properties** - Motel properties
- **RoomTypes** - Different room categories per property
- **RoomInventory** - Individual room management
- **Bookings** - Reservation records
- **Photos** - Property and room images
- **BookingStatusHistory** - Audit trail for bookings

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Cloudinary account (for image uploads)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd motel-booking-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your database connection and API keys:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
   CLOUDINARY_API_KEY="your-cloudinary-api-key"
   CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. (Optional) Seed the database with sample data:
   ```bash
   npx prisma db seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── login/             # Authentication pages
│   ├── properties/        # Property listing and details
│   └── register/          # User registration
├── components/            # Reusable React components
│   └── ui/               # UI component library
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication configuration
│   ├── prisma.ts         # Database client
│   └── utils.ts          # Utility functions
└── types/                 # TypeScript type definitions
```

## Key Features Implementation

### Authentication System
- NextAuth.js with credentials provider
- Password hashing with bcrypt
- JWT session management
- Role-based access control

### Database Management
- Prisma ORM with PostgreSQL
- Database migrations and seeding
- Type-safe database queries
- Relationship management

### Admin Panel
- Property and room management
- Booking status tracking
- User management
- Analytics dashboard
- File upload handling

### Customer Interface
- Property search and filtering
- Room availability checking
- Secure booking process
- User account management

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Properties (planned)
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create property (admin)
- `GET /api/properties/[id]` - Get property details
- `PUT /api/properties/[id]` - Update property (admin)

### Bookings (planned)
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List user bookings
- `PUT /api/bookings/[id]` - Update booking status (admin)

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup and database schema
- [x] Authentication system
- [x] Basic UI components
- [x] Admin panel structure

### Phase 2: Core Features (In Progress)
- [ ] Property management (CRUD operations)
- [ ] Room type management
- [ ] Booking system implementation
- [ ] Image upload functionality

### Phase 3: Advanced Features
- [ ] Real-time availability checking
- [ ] Payment integration
- [ ] Email notifications
- [ ] Reviews and ratings

### Phase 4: Optimization
- [ ] Performance optimization
- [ ] SEO improvements
- [ ] Testing implementation
- [ ] Deployment configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
