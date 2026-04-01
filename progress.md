# Development Progress

## Commit 1: Project Foundation
- Initialized bun project with TypeScript and Express.js v5
- Configured ESLint (flat config) and Prettier for code quality
- Created utility classes: ApiError (with factory methods), ApiResponse (consistent response shape), asyncHandler (async error forwarding)
- Built global error handler middleware (handles ApiError, Prisma errors, Zod errors)
- Added 404 not found middleware for undefined routes
- Centralized environment config with dotenv
- Health check endpoint: GET /api/v1/health
- Verified: server starts, health check returns 200, unknown routes return 404, lint/format/build pass

## Commit 2: Database Setup
- Installed Prisma ORM with SQLite provider
- Designed schema with User model (roles: VIEWER/ANALYST/ADMIN, active status) and FinancialRecord model (amount, type, category, date, soft delete)
- Added database indexes on frequently filtered columns
- Created idempotent seed script: 3 users (one per role) + 20 diverse financial records
- Verified: migrations run, seed is idempotent, data appears in Prisma Studio

## Commit 3: Authentication System
- Implemented JWT token generation and verification utility
- Built register endpoint with email uniqueness check and bcrypt password hashing
- Built login endpoint with generic error messages (prevents email enumeration)
- Built profile endpoint (GET /me) for authenticated users
- Created authentication middleware: extracts Bearer token, verifies JWT, checks user active status in database
- Created Zod validation middleware factory for reusable input validation
- Extended Express Request type for TypeScript support
- Verified: register/login/profile work, validation errors return field-level details, password never in responses

## Commit 4: User Management + RBAC
- Created authorization middleware (higher-order function accepting allowed roles)
- Built admin-only user CRUD: list (paginated), get by ID, update, delete (soft)
- Added pagination with page/limit params, search by name/email, filter by role/status
- Implemented self-modification guards: admins cannot deactivate themselves or change own role
- Verified: RBAC enforcement (403 for non-admin), pagination works, search filters correctly

## Commit 5: Financial Records CRUD
- Built full CRUD for financial records with role-based access
- Create/Update/Delete: Admin only. Read: Admin + Analyst
- Zod validation: positive amount, INCOME/EXPENSE type, required category, ISO date
- Soft delete: sets isDeleted flag, excluded from all subsequent queries
- Record responses include user info (id, name, email)
- Verified: CRUD works, validation catches bad input, soft-deleted records disappear from lists

## Commit 6: Filtering, Pagination, Search
- Extracted reusable utilities: buildPaginationParams, buildPaginationMeta, buildDateRangeFilter
- Refactored user and record services to use shared utilities
- Verified: type filter, date range, category filter, combined filters, sort (amount/date/createdAt), search, pagination edge cases (page 999 returns empty with correct total)

## Commit 7: Dashboard Summary APIs
- Summary: total income, expenses, net balance, record counts using Prisma aggregate
- Category summary: groupBy category and type with totals and counts
- Trends: monthly/weekly income vs expense using application-level date grouping
- Recent activity: N most recent records with user info
- All amounts rounded to 2 decimal places
- Verified: aggregation accuracy, all roles can access dashboard, unauthenticated requests rejected

## Commit 8: Test Suite
- Set up Jest with ts-jest ESM support and Supertest for HTTP testing
- Created test database isolation (separate SQLite file, clean state between tests)
- 49 integration tests across 4 files covering all endpoints
- Tests cover: success cases, validation errors, authorization enforcement, edge cases, soft delete behavior
- Verified: all 49 tests pass, no flaky tests

## Commit 9: Rate Limiting + Security Polish
- Global rate limiter: 100 requests per 15 minutes per IP
- Auth rate limiter: 10 requests per 15 minutes (brute-force protection)
- Request ID middleware: unique UUID per request (X-Request-Id header)
- Rate limits automatically disabled in test environment
- Verified: all 49 tests still pass with rate limiting in place

## Commit 10: Documentation
- Comprehensive README with setup guide, API documentation, design decisions
- Technical report (report.md) explaining every technology and pattern choice
- Interview preparation guide (interview.md) with Q&A for common questions
- Progress tracking and git change log
