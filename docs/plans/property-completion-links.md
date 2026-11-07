# Property completion links

## Agreed outcome

Staff can import an incomplete property JSON or open an existing listing and create a special link. The recipient sees the supplied photographs and preliminary details, fills missing fields without signing in, and saves to publish immediately. The user selected immediate publication on 7 November 2026.

## Design

Use the existing Prompt font, navy `#1e3a8a`, gold `#facc15`, slate text `#334155`, white `#ffffff`, and light slate background `#f8fafc`. The photograph anchors the page. Desktop places the property summary alongside the missing-field form. Mobile stacks photographs, summary, and form. Controls have visible labels, keyboard focus, 44px minimum targets, and explicit publication copy. The primary button says `บันทึกและเผยแพร่บ้าน`.

## Data flow and boundaries

- The authenticated property form uploads photographs using its existing uploader, then calls `propertyCompletionAdmin` to store a private snapshot. Incomplete data never creates a public property at this step.
- The special URL uses `/complete-property#<random-token>`. Only its SHA-256 hash is stored. Links expire after seven days and can be revoked by their creator or an administrator.
- `propertyCompletionPublic` reads a safe summary and accepts only fields missing in the snapshot. Existing data, internal financial fields, permissions, and image URLs are never writable by the recipient.
- Submission verifies required fields and issuer permissions and publishes atomically. Retrying a successful submission returns the same result. Existing properties use their saved revision to reject stale writes and cannot be resurrected after deletion.
- The public page is outside the authenticated admin layout. Access to the private collection is denied through client Firestore rules.

## Implementation

1. `functions/property-completion-core.cjs`, `functions/property-completion.js`, `functions/index.js`, and server tests. Verify validation, scoped edits, expiration, revocation, permissions, replay, and transaction behavior using Node tests.
2. `src/features/ai-property/propertyDraft.js` and its tests. Allow incomplete location only through the explicit JSON-import validation option. Preserve other financial and content checks.
3. `src/features/property-completion/` for callable clients, admin link controls, and public completion page. Reuse the current photo uploader and money inputs. Add the public route in `src/App.jsx` and creation controls in `src/admin/PropertyForm.jsx`.
4. Add explicit denial for `_propertyCompletionRequests` in `firestore.rules`. Verify builds, lint on touched files, meaningful tests, and rendered desktop/mobile states.

## Acceptance

An incomplete JSON with photos imports successfully. Staff can copy a link without filling missing prices/location. An unauthenticated recipient can view photos and edit the missing fields. Invalid data is rejected. A valid submission publishes one correct property with both status fields set to `available`. Expired, revoked, altered, and stale requests fail safely. Known fields cannot be overwritten through a crafted public request.

## Deployment

Local verification precedes deployment. Firebase Functions and the admin Hosting application need the new version together before live links can be used.

## Verification on 7 November 2026

The production build passed. All 374 existing and new Node tests passed. New client modules and the callable wrapper passed targeted ESLint. Full-project lint still reports existing failures in unrelated files and the existing unused setter/dependency warning in PropertyForm.

The actual public route rendered at a 1280px desktop viewport with simulated completion responses. Filling price and location and submitting reached the completed state. These browser checks used a temporary development-only API substitute and performed no production writes. Browser tools became unavailable before mobile and authenticated import/link controls could be checked visually. Real Firebase transactions and deployment remain to be verified against the live environment.

## Live rollout and internal error fix

On 7 November 2026, the user reported `internal` when creating a link. Firebase's live function inventory confirmed both completion callables were absent. Deployed `propertyCompletionAdmin` and `propertyCompletionPublic` to `sps-property` in `us-central1`, followed by the updated Hosting application at `https://sps-property.web.app`.

Verified live callable responses with the Hosting origin. Anonymous creation returns the expected 401 authentication error, and public lookup of an unknown random token returns the expected 404 with Thai copy after reading Firestore. Both responses permit the expected origin. The `/complete-property` route returns 200 and references the current build. Its deployed JavaScript includes the new Thai fallback for internal transport errors. The targeted 19 tests, targeted lint, and production build pass. Authenticated creation through the user's browser remains a separate check.
