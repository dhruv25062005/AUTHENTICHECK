# Verification API

Planned endpoint family for consumer verification.

## GET /api/v1/verify/:serial

Purpose:
- resolve a product instance
- validate current status
- retrieve safe product details
- create a scan record

## POST /api/v1/verify/image

Purpose:
- accept a supported product image
- validate file type and size
- send image to AI service
- store model output
- contribute visual evidence to risk assessment

## Result model

The API should return a risk-oriented result such as:

```json
{
  "status": "SUSPICIOUS",
  "riskScore": 78,
  "reasons": [
    "Authentication identity has abnormal scan activity",
    "Visual similarity is below the configured threshold"
  ],
  "product": {
    "name": "Example Product",
    "manufacturer": "Example Manufacturer"
  }
}
```

The service must not represent a model prediction as a legal certification of authenticity.
