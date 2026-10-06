# UI verification · 6 October 2026

## Automated checks

- Client lint: passed
- Client production build: passed
- Client business rules: 8 tests passed
- Server authentication, Oracle adapter and transaction tests: 12 tests passed
- Server tests use an isolated memory database; no production Oracle writes

## Browser checks

Tested the running Vite app against `server/test/preview-server.cjs`.

- Passenger sign-in, seat selection, multi-round booking and QR ticket display
- Cancellation confirmation and cancelled history state
- Changing travel date updates available rounds; empty-date results show a useful empty state
- Driver sign-in, assigned shifts, starting a round and stop timeline
- Manual QR lookup shows passenger details before confirmation
- Check-in updates seat counters; repeated QR is rejected
- Closing a round records completion and displays the summary
- Admin sign-in, permission switches persist and navigation updates
- Routes display stops, duration and a schematic; edits to scheduled routes are visibly disabled
- User form loads departments and positions from API data
- Mobile widths 320 and 390, desktop width 1280; no page-level horizontal overflow in the route view
- No browser error/warning logs during the exercised flows

## Screenshots

- `booking-mobile.jpg`: passenger booking and fixed confirmation bar
- `tickets-mobile.jpg`: two QR tickets from one booking
- `permissions-mobile.jpg`: role tabs and permission switches
- `routes-desktop.jpg`: desktop route editor

## Remaining integration checks

- Real Oracle connectivity was not exercised in this UI task.
- Physical camera capture/scan and QR image download were not exercised in the browser; manual QR check-in was exercised.
- GPS, actual arrival timestamps and distance are not present in the existing data schema. The UI shows route order and planned times without fabricated location data.

## Database permission update · 6 October 2026

- Client 10 tests and server 16 tests passed; client lint/build passed.
- All positions can grant/revoke every screen; P1 has no API or UI bypass.
- Position and department CRUD persistence tested through the Oracle adapter using isolated unit-test data.
- Connected to the configured Oracle database and verified 3 departments and 3 remaining positions.
- Committed migration: inserted SC10/SC11 and preserved their previous P1 access as ordinary permission records; removed the unreferenced P4 position named ทดลองระบบ.
- Read back Oracle state after commit: 11 screens, 10 permission rows, no ทดลองระบบ position.
- Removed the standalone preview server and client preview stores; test fixtures live only in shared/test.
- Stopped the prior preview processes, restarted the actual Oracle backend with the new code, and repointed the website to it.
- Reloaded the website and verified it requests a real account sign-in. Authenticated UI verification on real accounts was not performed; no existing passwords were queried or changed.
- Earlier screenshots in this folder document the previous design verification, not current database contents.

## Account update · 6 October 2026

- Client 11 tests and server 23 tests pass; lint and production build pass.
- HTTP tests verify automatic ID allocation under concurrent creation, required fields, transaction rollback, and SC01 authorization.
- Driver and passenger profile tests verify database persistence, own-account enforcement, unchanged role/department/phone, current-password validation, password confirmation, and session rotation/revocation.
- Read-only Oracle verification: 6 existing users, next proposed ID U007; USER_ID VARCHAR2(10), names VARCHAR2(100), PASSWORD VARCHAR2(50).
- Restarted the actual Oracle backend with the account endpoints. No real account names or passwords were modified during testing.
- Authenticated UI checks against real accounts remain unperformed; no existing credentials were queried.
