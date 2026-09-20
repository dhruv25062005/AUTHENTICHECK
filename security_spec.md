# Security Specification: AuthentiCheck Firebase Rules

## 1. Data Invariants
- A user document `/users/{userId}` must strictly correspond to the authenticated user whose `request.auth.uid == userId`.
- Users cannot elevate their own permissions or alter critical role fields once established.
- Sensitive user records are accessible exclusively by the authenticated user (`isOwner(userId)`).
- Incident reports `/incidentReports/{reportId}` can be created by authenticated or unauthenticated users (for anonymous consumer anti-counterfeit reporting), but once submitted they cannot be tampered with or deleted by unauthorized clients.
- Catch-all default deny rule prevents unauthorized reads and writes across any unmapped collection.

## 2. Dirty Dozen Payloads (Targeting Vulnerabilities)
1. **Payload 1 (Ghost Field in User profile):** `{ userId: "u123", email: "a@b.com", role: "CONSUMER", isAdmin: true, ghostField: "injected" }` -> MUST FAIL.
2. **Payload 2 (ID Spoofing):** User `u999` tries writing to `/users/u888` -> MUST FAIL with permission denied.
3. **Payload 3 (Role Escalation during update):** Standard user tries changing `role` from `"CONSUMER"` to `"ADMIN"` -> MUST FAIL.
4. **Payload 4 (Massive ID Poisoning):** Document path with a 1.5KB string -> MUST FAIL via `isValidId()`.
5. **Payload 5 (Oversized string payload):** Display name exceeding 100 characters -> MUST FAIL.
6. **Payload 6 (Invalid email format):** Non-email string in email field -> MUST FAIL.
7. **Payload 7 (Unauthenticated write to another user's profile):** Unauthenticated POST -> MUST FAIL.
8. **Payload 8 (Blanket collection read scraping):** Reading entire `/users` collection without user filter -> MUST FAIL.
9. **Payload 9 (Tampering with report creation date):** Incident report with invalid timestamp -> MUST FAIL.
10. **Payload 10 (Modifying existing incident report):** Client attempting to alter or delete an existing incident dossier -> MUST FAIL.
11. **Payload 11 (Oversized incident report reason):** Reason field exceeding 1000 characters -> MUST FAIL.
12. **Payload 12 (Direct update to non-existent document):** Client injecting orphaned updates -> MUST FAIL.
