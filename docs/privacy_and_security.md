# AEGIS — Privacy, Security, and Data Protection Charter

### 1. Data Classification & Threat Model
AEGIS processes sensitive personal safety data, including real-time coordinates, emergency contact details, and distress event histories. The system operates under the following classification:

| Data Type | Sensitivity | Protection Mechanism |
| :--- | :--- | :--- |
| **User Identity & Phone** | Confidential | Firebase UID binding, parameterized queries, rate-limited auth. |
| **Emergency Contacts** | Confidential | Strict user-isolation validation on all CRUD operations. |
| **GPS Coordinates** | Highly Confidential | Acquired strictly on-demand. Stored only during active SOS or live session. |
| **Live Sharing Tokens** | Secret | 256-bit entropy random tokens; stored as SHA-256 hashes in database. |
| **Medical / Accessibility Notes** | Optional / Restricted | Encrypted transport, editable and purgeable by user at any time. |

---

### 2. Live Location Sharing Architecture
Unlike legacy safety apps that expose predictable sequential numeric IDs (e.g., `/live/102`), AEGIS enforces:
1. **Unguessable Tokens**: Each session generates a 256-bit cryptographically secure hexadecimal token (`generateSecureToken(32)`).
2. **One-Way Token Hashing**: The database stores only the `SHA-256` digest (`token_hash`) of the token.
3. **Hard Expiry**: Sessions terminate automatically when `expires_at` is reached (default 60 minutes, max 240 minutes).
4. **Immediate Revocation**: Users can tap "Stop Sharing" at any moment to invalidate the token immediately.

---

### 3. User Resource Isolation
The backend enforces tenant separation on every resource query:
- A user cannot read, update, or delete another user's emergency contacts, even if they guess the contact's UUID.
- SOS alert details and recipient delivery reports are restricted strictly to the alert initiator.
- In automated security testing, attempts by User B to alter User A's data return `403 FORBIDDEN`.

---

### 4. Background Location Principles
- Continuous background GPS tracking is **disabled by default**.
- Coordinates are sampled only when:
  1. An explicit SOS alert is triggered by the user.
  2. The user initiates an active live location sharing session.
- Compliance with Android background location limits and runtime permission rationales is strictly maintained.
