# Technical Report: Why Each Technology Was Used

## Architecture Decisions

### Why TypeScript over JavaScript?
TypeScript adds static type checking that catches bugs at compile time rather than runtime. In a financial application, type safety prevents subtle issues like passing a string where a number is expected. It also provides excellent IDE support with autocomplete and inline documentation.

### Why Express.js v5?
Express is the most widely adopted Node.js web framework. Version 5 adds native async error handling (rejected promises automatically forward to the error handler), which eliminates a common class of bugs. Its minimal, unopinionated design lets us structure the application our way.

### Why Prisma ORM over raw SQL or other ORMs?
Prisma generates a fully typed client from the schema, so every database query is type-checked at compile time. This eliminates entire categories of bugs (wrong column names, type mismatches). The schema file serves as living documentation of the data model. Compared to Sequelize or TypeORM, Prisma's declarative schema is cleaner and its query API is more intuitive.

### Why SQLite over PostgreSQL?
For an evaluation project, SQLite requires zero infrastructure setup. Anyone can clone the repo and run it immediately without installing a database server. The Prisma schema can be switched to PostgreSQL by changing one line in the datasource configuration.

**Tradeoff acknowledged:** SQLite doesn't support concurrent writes well and has limited date functions. In production, we would use PostgreSQL for proper Decimal types, concurrent access, and native date aggregation.

### Why JWT for Authentication?
JWTs are stateless tokens that don't require server-side session storage. This makes the API horizontally scalable (any server can verify any token). The token contains the user ID and role, which are verified against the database on every request to ensure deactivated users are immediately locked out.

### Why bcrypt for Password Hashing?
bcrypt is specifically designed for password hashing with a configurable cost factor (we use 10 rounds). Unlike SHA-256 or MD5, bcrypt is intentionally slow, making brute-force attacks impractical. It automatically handles salt generation and storage.

### Why Zod over Joi or express-validator?
Zod integrates natively with TypeScript, inferring types directly from schemas. This means the validation schema and the TypeScript type are always in sync. Zod also has a smaller bundle size and a more modern API compared to Joi.

### Why Jest + Supertest?
Jest is the most popular JavaScript testing framework with excellent TypeScript support via ts-jest. Supertest allows testing HTTP endpoints without starting a real server, which makes tests fast and deterministic. Integration tests (testing through HTTP) give higher confidence than isolated unit tests for an API project.

## Design Pattern Decisions

### Why Controller-Service-Schema Pattern?
Each module has exactly three responsibilities:
- **Controller**: Handles HTTP request/response, calls service methods
- **Service**: Contains all business logic and database queries
- **Schema**: Defines input validation rules

This separation means changing the database only affects services, changing the HTTP framework only affects controllers, and validation rules are centralized in one place.

### Why asyncHandler Wrapper?
Express 5 handles async errors natively, but the asyncHandler wrapper makes the pattern explicit and self-documenting. It ensures every async controller method properly forwards errors to the global error handler.

### Why a Custom ApiError Class?
The custom error class allows the global error handler to distinguish between:
- **Operational errors** (bad input, unauthorized): Return the error message to the client
- **Programming errors** (unexpected crashes): Return a generic 500 message, log details server-side

The static factory methods (ApiError.badRequest(), ApiError.unauthorized()) make error creation concise and consistent.

### Why ApiResponse Utility?
Every API response follows the same shape: `{ success, message, data, meta }`. This makes the API predictable for frontend developers. The utility class ensures consistency and eliminates the risk of one endpoint returning a different format.

### Why Soft Delete for Financial Records?
Financial data should never be permanently deleted for audit and compliance reasons. The `isDeleted` boolean flag allows "deletion" while preserving the data. An index on `isDeleted` ensures the filter doesn't impact query performance.

### Why Rate Limiting with Two Tiers?
- **Global limiter (100/15min)**: Prevents general abuse of the API
- **Auth limiter (10/15min)**: Stricter limit on login/register endpoints to prevent brute-force password attacks

The rate limiter uses standard headers so clients can implement backoff logic.

### Why Request ID Middleware?
Each request gets a unique UUID in the `X-Request-Id` header. This enables request tracing across logs, which is essential for debugging production issues. The same ID appears in request and response, creating a correlation chain.

## Database Design Decisions

### Why cuid for Primary Keys?
cuids (collision-resistant unique identifiers) are URL-friendly, don't require coordination between servers, and don't leak information about record counts (unlike auto-increment integers).

### Why Database Indexes on Filter Columns?
Indexes on `userId`, `type`, `category`, `date`, and `isDeleted` ensure that the WHERE clauses used in list queries and dashboard aggregations execute efficiently even with large datasets.

### Why Float Instead of Decimal for Amounts?
SQLite doesn't have a native Decimal type. Float is acceptable for this demo but introduces potential rounding issues (e.g., 0.1 + 0.2 = 0.30000000000000004). In production with PostgreSQL, we would use Prisma's Decimal type for exact arithmetic.

## Testing Strategy

### Why Integration Tests over Unit Tests?
For a backend API, integration tests (testing through HTTP with Supertest) provide the highest confidence-to-effort ratio. They test the full middleware chain, validation, business logic, and database together in a single assertion.

### Why Separate Test Database?
Tests use a separate SQLite file to avoid corrupting development data. Each test suite cleans up with `deleteMany` in `beforeEach` to ensure test isolation.

### Why Sequential Test Execution?
SQLite has a single-writer lock. Running tests in parallel would cause SQLITE_BUSY errors. The `--runInBand` flag ensures sequential execution, trading speed for reliability.
