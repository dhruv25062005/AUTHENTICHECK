# AuthentiCheck Architecture

## Architectural style

AuthentiCheck uses a modular service-oriented architecture:

1. Next.js web application
2. Express API
3. PostgreSQL persistence
4. Redis for caching/queues
5. FastAPI AI service
6. S3-compatible object storage

## Verification pipeline

```
Consumer input
    |
    +-- QR / serial ----------------+
    |                               |
    +-- product image               |
                                    v
                              Express API
                                    |
              +---------------------+---------------------+
              |                     |                     |
              v                     v                     v
        Identity check        Scan history          AI service
              |                     |                     |
              +---------------------+---------------------+
                                    |
                              Risk Assessment
                                    |
                     +--------------+--------------+
                     |              |              |
                     v              v              v
                  Genuine       Suspicious      High Risk
```

## Trust model

A valid QR is an identity lookup mechanism, not standalone proof of authenticity.

Risk decisions should combine:
- product identity status
- scan history
- duplicate/reuse signals
- image similarity/anomaly signals
- reports/investigation evidence

## Initial implementation scope

Phase 1 establishes repository structure, local development configuration, database and service boundaries. AI training and advanced fraud detection are added later.
