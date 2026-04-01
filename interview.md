# Interview Preparation Guide

## Architecture Questions

### Q: Walk me through the architecture of this project.

The project follows a modular architecture with four domain modules: auth, user, record, and dashboard. Each module has a controller-service-schema pattern where controllers handle HTTP, services handle business logic and database access, and schemas define input validation with Zod.

The middleware layer handles cross-cutting concerns: authentication (JWT verification), authorization (role-based access control), validation (Zod schema checking), error handling (centralized global handler), and rate limiting.

The data layer uses Prisma ORM with SQLite, providing type-safe database queries. The schema defines two models: User and FinancialRecord, connected by a one-to-many relationship.

### Q: How does the authentication flow work?

1. **Registration**: User submits email, password, name. Password is hashed with bcrypt (10 salt rounds). A JWT token is generated containing the userId and role.

2. **Login**: User submits email and password. We find the user by email, compare the password hash, check if the account is active, then generate a JWT token.

3. **Protected routes**: The `authenticate` middleware extracts the Bearer token from the Authorization header, verifies the JWT signature, fetches the user from the database (to check active status), and attaches the user object to `req.user`.

4. **Security details**: Login failure returns a generic "Invalid credentials" message regardless of whether the email or password is wrong, to prevent email enumeration. Password hashes are never included in any API response using Prisma's `select` option.

### Q: Explain the access control system.

The system uses role-based access control (RBAC) with three roles: VIEWER, ANALYST, and ADMIN.

The `authorize` middleware is a higher-order function that accepts an array of allowed roles and returns Express middleware. It's composable: `authorize('ADMIN')` for admin-only, `authorize('ADMIN', 'ANALYST')` for admin+analyst.

The middleware checks `req.user.role` (set by the authenticate middleware) against the allowed roles. If the role isn't in the list, it throws a 403 Forbidden error.

Key access rules:
- Viewer: Can only view dashboard data
- Analyst: Can view dashboard + read financial records
- Admin: Full access to everything including user management

### Q: How do you handle errors?

All errors flow through a centralized error handler middleware. The `ApiError` custom class carries a status code, message, and an `isOperational` flag.

The error handler distinguishes:
- **ApiError instances**: Returns the specific status code and message
- **Prisma errors**: Catches unique constraint violations (P2002) and returns 409 Conflict
- **Zod errors**: Formats field-level validation errors and returns 400
- **Unknown errors**: Returns 500 with a generic message (never leaks stack traces to the client)

The `asyncHandler` wrapper catches rejected promises from async route handlers and forwards them to this error handler.

### Q: What testing strategy did you use?

I used integration tests with Jest and Supertest. Each test file tests through HTTP, hitting the full middleware chain (rate limiter -> auth -> RBAC -> validation -> controller -> service -> database).

There are 49 tests across 4 files:
- **auth.test.ts**: Registration, login, profile, validation errors
- **user.test.ts**: Admin CRUD, RBAC enforcement, pagination, search
- **record.test.ts**: Record CRUD, soft delete, filtering, sorting
- **dashboard.test.ts**: Aggregation accuracy, empty state handling, access control

Tests use a separate SQLite database and clean all data in `beforeEach` for isolation.

## Technical Deep-Dive Questions

### Q: Why did you choose SQLite? What would you change in production?

SQLite was chosen for zero-config setup, making it easy for evaluators to clone and run. In production, I would switch to PostgreSQL for:
- Proper Decimal type for exact financial calculations
- Concurrent read/write support
- Native date truncation functions for trends queries (instead of application-level grouping)
- Full-text search capabilities
- Connection pooling

The switch is straightforward with Prisma: change `provider = "sqlite"` to `provider = "postgresql"` and update the connection URL.

### Q: How does the dashboard aggregation work?

The summary endpoint uses Prisma's `aggregate` to compute income/expense totals at the database level. The category summary uses `groupBy` to group records by category and type, also database-level.

The trends endpoint is the most interesting: Prisma doesn't support date-truncation groupBy (like PostgreSQL's DATE_TRUNC). So I fetch all records within the time range and group them in application code using a Map, with keys like "2026-03" for monthly or "2026-03-04" (Monday date) for weekly. This is a conscious tradeoff documented in the code.

### Q: How do you prevent common security issues?

- **Helmet**: Sets security headers (CSP, X-Frame-Options, HSTS)
- **Rate limiting**: Prevents brute-force and DDoS attacks
- **bcrypt**: Makes password cracking computationally expensive
- **Input validation**: Zod validates all input at the API boundary
- **Body size limit**: `express.json({ limit: '10kb' })` prevents payload-based attacks
- **No stack traces**: Production errors never expose internal details
- **Email enumeration prevention**: Generic "Invalid credentials" message on login failure
- **Token verification with DB check**: Deactivated users are immediately locked out

### Q: What would you do differently with more time?

1. **PostgreSQL**: Switch to PostgreSQL for production-grade data types and concurrent access
2. **Redis caching**: Cache dashboard aggregations that don't change frequently
3. **API versioning**: Add proper version negotiation beyond the /v1 prefix
4. **Refresh tokens**: Implement token refresh flow instead of long-lived access tokens
5. **Audit logging**: Track who changed what and when for compliance
6. **OpenAPI/Swagger**: Auto-generate API documentation from route definitions
7. **Docker**: Containerize the application for consistent deployment
8. **CI/CD**: Add GitHub Actions for automated testing and deployment

### Q: How would you scale this?

1. **Database**: Move to PostgreSQL with read replicas for heavy read workloads
2. **Caching**: Redis for session management, rate limiting, and dashboard caches
3. **Horizontal scaling**: The stateless JWT design means any server can handle any request
4. **Message queue**: Move expensive operations (email, reports) to background workers
5. **CDN**: For any static assets served by the API
6. **Database connection pooling**: PgBouncer or built-in Prisma pooling

### Q: Explain the soft delete implementation.

Records have an `isDeleted` boolean field (default: false). When "deleted", this field is set to true instead of removing the row. Every query that fetches records includes `isDeleted: false` in the WHERE clause.

An index on `isDeleted` ensures this filter is fast. The dashboard aggregation endpoints also exclude soft-deleted records.

In production, you might add a `deletedAt` timestamp for audit purposes and a scheduled job to purge records after a retention period.

## Code-Specific Questions

### Q: Why do you use `satisfies` keyword in TypeScript?

The `satisfies` operator (TypeScript 4.9+) validates that a value matches a type without widening it. For example, `userSelectFields satisfies Prisma.UserSelect` ensures the select object is a valid Prisma select configuration while preserving the literal types of each field. This gives us both type safety and precise autocomplete.

### Q: Why is the Prisma client a singleton?

Creating multiple Prisma clients would open multiple connection pools, eventually exhausting database connections. The singleton pattern in `config/database.ts` ensures the entire application shares one client instance.

### Q: Why check `isActive` in the authenticate middleware instead of just relying on the JWT?

JWTs are stateless - once issued, they're valid until expiration. If an admin deactivates a user, the user's existing token would still work. By checking `isActive` in the database on every request, we can immediately revoke access by deactivating the user. This is a deliberate tradeoff of a small database query per request for the ability to lock out users in real-time.

### Q: How do you handle the float precision issue?

We round all monetary values to 2 decimal places using `Math.round(value * 100) / 100` before including them in API responses. This prevents floating-point artifacts like `0.30000000000000004` from appearing in the dashboard. In production with PostgreSQL, we would use the Decimal type which provides exact decimal arithmetic.
