# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users/{userId}`, `users/{userId}/private/info`, `wallets/{userId}`, `transactions/{txId}`, `products/{productId}/reviews/{reviewId}`) must strictly bind its ownership field (`uid`, `ownerUid`, `authorUid`) to `request.auth.uid` on create and keep it immutable on update.
2. **PII Isolation**: User email addresses and authentication metadata live exclusively in `/users/{userId}/private/info`, readable/writable only by the owner (`request.auth.uid == userId && isVerifiedUser()`) or verified admin.
3. **No Self-Assigned Privilege Escalation**: Users cannot create `/users/{userId}` with `role == 'ADMIN'` or modify `role` on update unless they already pass `isAdmin()` (or match the bootstrapped verified admin `truqaman@gmail.com`). `/admins/{userId}` is read-only for clients except the bootstrapped verified admin.
4. **Product & Inventory Governance**: Public catalog reads (`get`, `list`) are allowed for storefront browsing; creating/deleting products requires `isAdmin()`. Updates to inventory or `likesCount` / `reviewsCount` require verified authentication (`isVerifiedUser()`) and strict `affectedKeys().hasOnly(...)` action allowlists, with inventory bounded `>= 0`.
5. **Terminal Transaction Locking**: Once a transaction document in `/transactions/{transactionId}` reaches `status == 'CONFIRMED'` or `'REVERTED'`, non-admin clients cannot mutate or delete it.
6. **Temporal Integrity & Bounded Payloads**: `createdAt` and `updatedAt` timestamps must equal `request.time`; all string fields enforce `.size()` bounds; all IDs match `^[a-zA-Z0-9_\\-]+$`; arrays (`tags`, `supportedChains`) enforce strict size caps and element checks.

## 2. "Dirty Dozen" Adversarial Payloads
1. **Shadow Update (`isAdmin` injection on profile)**: `{ "uid": "u1", "name": "Mallory", "role": "ADMIN", "enclaveAddress": "0x...", "isVerifiedAdmin": true }` -> Denied by `keys().hasOnly(...)` and `role == 'SHOPPER'` check.
2. **Ghost Field on Transaction Create**: `{ ..., "adminOverride": true }` -> Denied by `isValidTransaction()` `keys().hasOnly(...)`.
3. **Unverified Email Spoofing**: Authenticated token with `email: "truqaman@gmail.com"` and `email_verified: false` -> Denied by `isVerifiedUser()` (`request.auth.token.email_verified == true`).
4. **Cross-Tenant PII Read**: Authenticated `userB` calling `get(/users/userA/private/info)` -> Denied (`request.auth.uid == userId`).
5. **Cross-Tenant Transaction List Scrape**: `userB` executing unconstrained `list(/transactions)` without `where('ownerUid', '==', userB)` -> Denied by `allow list: if isVerifiedUser() && resource.data.ownerUid == request.auth.uid`.
6. **Owner Spoofing on Transaction Create**: `userB` writing `transactions/tx99` with `ownerUid: "userA"` -> Denied (`incoming().ownerUid == request.auth.uid`).
7. **Terminal Transaction Tampering**: Updating `tokenAmount` on a `CONFIRMED` transaction -> Denied by terminal state lock (`existing().status != 'CONFIRMED'`).
8. **ID Poisoning**: Creating `/products/` + `"a".repeat(200)` or ID with `/` or `$` -> Denied by `isValidId(productId)`.
9. **Denial of Wallet String Exhaustion**: Creating a review with a 500KB `comment` string -> Denied by `data.comment.size() <= 1000`.
10. **Array Overflow**: Creating a product with 500 `tags` -> Denied by `data.tags.size() <= 10`.
11. **Backdated Timestamp Spoofing**: Creating a transaction with `createdAt` from 2020 -> Denied by `incoming().createdAt == request.time`.
12. **Immortal Field Mutation**: Updating `createdAt` or `originalOwnerId` on an existing document -> Denied by `incoming().createdAt == existing().createdAt`.
