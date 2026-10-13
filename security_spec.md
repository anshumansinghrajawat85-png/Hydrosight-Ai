# HydroSight AI — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths in Firestore are strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: All writes require an authenticated user with `request.auth.token.email_verified == true`.
3. **Ownership Enforcement**: A `SavedSimulation` or `AlertAcknowledgement` document can only be created, read, listed, updated, or deleted if `ownerId == request.auth.uid`.
4. **No Role Escalation**: Users creating `/users/{userId}` can only set `role == 'analyst'` unless they are an explicit system admin (`isAdmin()`). `role`, `uid`, and `createdAt` cannot be mutated by regular users.
5. **Strict Key & Size Enforcement**: Every entity validation helper enforces `.keys().hasAll(...)` and `.keys().hasOnly(...)` along with exact `maxLength` and `pattern` bounds from `firebase-blueprint.json`.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating a simulation with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating a user profile with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Creating a `SavedSimulation` where `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
4. **Privilege Escalation**: Creating `/users/{userId}` with `role: "admin"` by non-admin -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Updating or creating `SavedSimulation` with an extra field `isVerified: true` -> `PERMISSION_DENIED`.
6. **ID Poisoning Attack**: Creating a document with a 500-character ID or invalid characters (`$#@!`) -> `PERMISSION_DENIED`.
7. **Denial of Wallet (Oversized String)**: Creating `SavedSimulation` with `notes` exceeding 500 chars -> `PERMISSION_DENIED`.
8. **Timestamp Forgery**: Creating `AlertAcknowledgement` with a past/future client timestamp (`createdAt != request.time`) -> `PERMISSION_DENIED`.
9. **Immortal Field Mutation**: Updating `createdAt` or `ownerId` on an existing `SavedSimulation` -> `PERMISSION_DENIED`.
10. **Terminal State Bypass**: Updating an `AlertAcknowledgement` once its `status` is already `'resolved'` -> `PERMISSION_DENIED`.
11. **Cross-Tenant List Scraping**: Querying `/simulations` without filtering `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
12. **Value Poisoning on Update**: Updating `notes` on `SavedSimulation` with a number or boolean instead of a bounded string -> `PERMISSION_DENIED`.
