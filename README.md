# AuthentiCheck

AI-Powered Product Authentication & Counterfeit Risk Detection Platform.

## Status

Phase 1 foundation.

## Planned stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Cache/queues: Redis
- AI service: Python + FastAPI
- Object storage: S3-compatible storage
- Authentication: JWT + role-based access control
- Deployment: Docker + cloud

## Core workflow

Manufacturer → Product → Batch → Product Instance → Secure QR/Serial → Consumer Verification → AI/Image Signals + Scan Behavior → Risk Engine → Result → Investigation/Analytics

## Important design principle

AuthentiCheck does not treat a QR code or AI image prediction alone as proof of authenticity. It combines multiple signals and presents a risk-oriented verification result.

## Repository structure

```
apps/
  web/       # Next.js frontend
  api/       # Express API
services/
  ai/        # FastAPI AI service
database/
  migrations/
  seeds/
packages/
  shared/
  types/
docs/
  architecture/
  api/
docker/
```

More implementation documentation will be added as each phase is completed.
