# AuthentiCheck

**AuthentiCheck — AI-assisted product authentication and counterfeit-risk verification platform.**

AuthentiCheck combines manufacturer registration, product identity records, opaque QR credentials, serial verification, scan history, consumer reports, lifecycle status, and explainable risk rules. Visual AI is an additional signal; it is not treated as proof of authenticity.

## Current architecture

Next.js web → Express + TypeScript API → PostgreSQL

Express also connects to a FastAPI image-analysis service.

## Implemented workflows

- Email/password registration and login with short-lived HS256 access tokens.
- Consumer and manufacturer roles.
- Manufacturer verification workflow for administrators.
- Product creation and batch/serial issuance restricted to verified manufacturers.
- Opaque QR credentials with SHA-256 hashes stored in PostgreSQL.
- QR revocation when a replacement QR is issued.
- Serial and QR verification.
- Scan history and recent-scan velocity signals.
- Privacy-preserving IP/device fingerprints for scan history.
- Product lifecycle states including active, sold, recalled, blocked, stolen, and retired.
- Explainable risk assessments with versioned rules.
- Consumer counterfeit/suspicion reports.
- Manufacturer analytics.
- Audit-log records for administrative and lifecycle changes.
- Database-backed password-reset tokens.
- Baseline image-quality analysis through FastAPI/Pillow.
- Explicit AI-unavailable state; registry verification remains independent.

## Verification model

A QR code is an identity credential, not proof by itself.

A verification can combine registered identity, QR credential validity, lifecycle status, scan behavior, consumer reports, visual-analysis signals, and explainable risk rules.

The result is a risk-oriented assessment such as GENUINE, SUSPICIOUS, or HIGH_RISK. It is not a legal determination of authenticity or fraud.

## AI limitation

The included FastAPI service currently provides a real image-quality baseline using resolution, exposure, and contrast. It does not claim to classify counterfeit products.

Reference-image similarity requires manufacturer reference images and a trained/comparison model. The application therefore reports unavailable similarity rather than inventing a confidence score.

## Repository structure

apps/web  — Next.js frontend
apps/api  — Express API
services/ai  — FastAPI image-analysis service
database/migrations  — PostgreSQL migrations

## Local development

Create the repository-root .env with DATABASE_URL, WEB_ORIGIN, PUBLIC_VERIFY_URL, AI_SERVICE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET.

Start the API with: npm run dev:api
Start the web app with: npm run dev:web

Start the AI service from services/ai with: uvicorn app.main:app --host 0.0.0.0 --port 8000

## Database migrations

Apply migrations in filename order from database/migrations/001_initial_schema.sql through 005_product_lifecycle.sql.

## Production deployment checklist

1. Apply all migrations exactly once using a migration runner; do not manually reorder migration files.
2. Set `NODE_ENV=production`, strong unique JWT secrets, a production `WEB_ORIGIN`, `PUBLIC_VERIFY_URL`, `AI_SERVICE_URL`, and Redis.
3. Configure `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` before starting the API in production.
4. Put PostgreSQL and Redis behind private networking where supported; do not expose database ports publicly.
5. Terminate TLS at the deployment edge and serve the web/API over HTTPS.
6. Configure backups and restore testing for PostgreSQL.
7. Store evidence/reference images in private object storage with signed URLs rather than database blobs.
8. Monitor API, AI, database, and Redis health endpoints and alert on repeated failures.

## Production requirements

- Move rate limiting to Redis for multi-instance deployments.
- Password recovery supports Resend when configured; development reset links are logged locally and API responses remain privacy-safe.
- Add object storage for uploaded evidence/reference images.
- Train and validate a reference-image model with a representative dataset.
- Add automated API, database, and browser tests.
- Use managed secret storage and rotate JWT secrets.
- Run migrations through a controlled migration runner.
- Review retention/privacy requirements for scan fingerprints and uploaded images.

## Security principle

AuthentiCheck provides evidence and risk signals to support investigation. A QR code, image model, or risk score alone does not establish authenticity, fraud, or legal liability.