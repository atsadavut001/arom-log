# Security Specification

## 1. Data Invariants
1. **Identity Isolation**: A user can only read, create, update, and delete documents under `/users/{userId}` and `/users/{userId}/entries/{entryId}` where `{userId} == request.auth.uid`.
2. **User Document Invariant**: The `userId` field inside `/users/{userId}` must equal `request.auth.uid`.
3. **Mood Entry Invariant**: The `userId` field inside `/users/{userId}/entries/{entryId}` must equal `request.auth.uid`.
4. **Date Pattern Invariant**: Every mood entry must contain a valid ISO date `YYYY-MM-DD`.
5. **Score Range Invariant**: `moodScore` must be a number between 1 and 5.
6. **Tag Bound Invariant**: `tags` must be a list containing at most 15 tags, and if non-empty, elements must be strings of reasonable size.
7. **Immortal Fields**: Once created, `userId`, `id`, and `date` cannot be mutated.
8. **Size Bounding**: Strings like `note` (<= 2000 chars), `moodLabel` (<= 64 chars), and `moodType` (<= 32 chars) are strictly bounded to prevent resource exhaustion attacks.

## 2. The Dirty Dozen Payloads (Targeting Exploits)
1. **Unauthenticated Read**: Attempting to read `/users/user123/entries` without authentication -> DENY.
2. **Cross-User Snooping**: Authenticated user B attempting to read `/users/userA/entries` -> DENY.
3. **Cross-User Entry Hijack**: Authenticated user B attempting to write to `/users/userA/entries/2026-10-11` -> DENY.
4. **Identity Spoofing on Create**: User A attempting to create an entry in `/users/userA/entries/2026-10-11` with `userId: "userB"` -> DENY.
5. **Shadow Field Injection**: Attempting to write unexpected malicious attributes like `admin: true` -> DENY.
6. **Date Format Poisoning**: Attempting to inject `date: "../../../etc/passwd"` or invalid date string -> DENY.
7. **Out-of-Bounds Score**: Attempting to inject `moodScore: 9999` or negative numbers -> DENY.
8. **Unbounded Tags Array DOS**: Attempting to pass 500 tags to cause Denial-of-Wallet -> DENY.
9. **Immortal Field Tampering**: Attempting an update that alters `userId` or `date` -> DENY.
10. **Note Buffer Overflow**: Attempting to submit a 10MB note payload -> DENY.
11. **Path Variable Mismatch**: Attempting to write an entry where `incoming().id` does not match `{entryId}` -> DENY.
12. **Blanket Collection Traversal**: Querying all entries across all users without scoping to user's own path -> DENY.
