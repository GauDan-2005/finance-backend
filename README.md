# Finance Data Processing and Access Control Backend

A well-structured backend API for a finance dashboard system with role-based access control, financial record management, and analytics endpoints.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript | Type safety and developer experience |
| Express.js v5 | HTTP framework |
| Prisma ORM | Database access with type-safe queries |
| SQLite | Lightweight relational database |
| JWT | Stateless token authentication |
| bcrypt | Secure password hashing |
| Zod | Runtime input validation |
| Jest + Supertest | Integration testing |
| ESLint + Prettier | Code quality and formatting |
| express-rate-limit | API rate limiting |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (or Node.js v18+)

### Installation

```bash
git clone https://github.com/GauDan-2005/finance-backend.git
cd finance-backend
bun install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your values (defaults work for development)
```

### Database Setup

```bash
bun run db:migrate    # Create database and run migrations
bun run db:seed       # Seed with sample data (3 users + 20 records)
```

### Running the Server

```bash
bun run dev           # Development with hot-reload
bun run build         # Compile TypeScript
bun run start         # Production start
```

### Running Tests

```bash
bun run test          # Run all 49 tests
bun run test:coverage # Run with coverage report
```

### Code Quality

```bash
bun run lint          # Check for linting issues
bun run lint:fix      # Auto-fix linting issues
bun run format        # Format code with Prettier
bun run format:check  # Check formatting
```

## Seed Data Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password123 |
| Analyst | analyst@example.com | password123 |
| Viewer | viewer@example.com | password123 |

## API Documentation

Base URL: `http://localhost:5000/api/v1`

### Health Check

```
GET /health
```

### Authentication

```
POST /auth/register    # Create a new account
POST /auth/login       # Login and receive JWT token
GET  /auth/me          # Get current user profile (requires token)
```

**Register Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "VIEWER"
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (register/login):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "ADMIN" },
    "token": "eyJhbG..."
  }
}
```

### Users (Admin Only)

All endpoints require `Authorization: Bearer <token>` with ADMIN role.

```
GET    /users              # List users (with pagination, search, filters)
GET    /users/:id          # Get user by ID
PATCH  /users/:id          # Update user (role, name, isActive)
DELETE /users/:id          # Deactivate user (soft delete)
```

**Query Parameters for List:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `role` (VIEWER, ANALYST, ADMIN)
- `isActive` (true, false)
- `search` (searches name and email)

### Financial Records

Requires authentication. Create/Update/Delete: Admin only. Read: Admin + Analyst.

```
POST   /records            # Create record (Admin)
GET    /records            # List records (Admin, Analyst)
GET    /records/:id        # Get record by ID (Admin, Analyst)
PATCH  /records/:id        # Update record (Admin)
DELETE /records/:id        # Soft delete record (Admin)
```

**Create/Update Request:**
```json
{
  "amount": 1500.50,
  "type": "INCOME",
  "category": "Salary",
  "date": "2026-03-15T00:00:00.000Z",
  "description": "March salary"
}
```

**Query Parameters for List:**
- `page`, `limit` - Pagination
- `type` - INCOME or EXPENSE
- `category` - Filter by category
- `startDate`, `endDate` - Date range (ISO format)
- `search` - Search in description
- `sortBy` - date, amount, createdAt (default: date)
- `sortOrder` - asc, desc (default: desc)

### Dashboard (All Authenticated Users)

```
GET /dashboard/summary          # Total income, expenses, net balance
GET /dashboard/category-summary # Category-wise breakdown
GET /dashboard/trends           # Monthly/weekly trends
GET /dashboard/recent           # Recent activity
```

**Query Parameters:**
- `/trends?period=monthly&months=6` - Period (monthly/weekly), lookback months
- `/recent?limit=10` - Number of recent records

## Access Control Matrix

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| View dashboard | Yes | Yes | Yes |
| Read records | No | Yes | Yes |
| Create records | No | No | Yes |
| Update records | No | No | Yes |
| Delete records | No | No | Yes |
| Manage users | No | No | Yes |

## Project Structure

```
src/
├── config/              # Environment config, database client
├── types/               # TypeScript type extensions
├── utils/               # ApiError, ApiResponse, JWT, pagination, filters
├── middleware/           # Auth, RBAC, validation, error handling, rate limiting
└── modules/
    ├── auth/            # Register, login, profile
    ├── user/            # User CRUD (admin only)
    ├── record/          # Financial records CRUD
    └── dashboard/       # Analytics and summary endpoints
prisma/                  # Schema and seed data
tests/                   # Integration tests (49 tests)
```

## Design Decisions

- **Modular architecture**: Each module has controller (HTTP) -> service (business logic) -> schema (validation) separation
- **SQLite over PostgreSQL**: Zero-config setup for evaluation. In production, switch to PostgreSQL by changing the Prisma datasource
- **Soft delete**: Financial records use `isDeleted` flag instead of hard deletion for audit trail
- **Float for amounts**: Acceptable for demo. Production would use Decimal type with PostgreSQL
- **cuid for IDs**: URL-friendly, doesn't leak record counts like auto-increment
- **JWT with DB check**: Every request verifies the user exists and is active in the database, so deactivated users are immediately locked out even with valid tokens

## Assumptions

1. Single-tenant system (all users share the same data space)
2. Admin role can be assigned during registration (for demo purposes)
3. All authenticated users can view dashboard data
4. Financial records are always denominated in a single currency
5. Date filtering uses UTC timezone

## Response Format

All responses follow a consistent shape:

**Success:**
```json
{
  "success": true,
  "message": "Description of what happened",
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 47, "totalPages": 5 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "What went wrong",
  "errors": { "field": "Specific validation error" }
}
```
