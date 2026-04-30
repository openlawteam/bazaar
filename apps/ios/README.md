# Bazaar iOS

Owned by Suvina.

This folder contains a SwiftUI starter scaffold for the iOS app. The app should focus on account management, buyer profile editing, active wants, approvals, and notification/widget surfaces. It should not duplicate the SMS conversation loop.

## Starter Structure

`BazaarIOS` includes:

- `App`: app entry and tab shell.
- `Config`: base URL and environment config.
- `Core/Networking`: API client calls.
- `Models`: basic typed models for profile and wants.
- `Features/Account`: phone sign-in and OTP UI scaffold.
- `Features/Profile`: buyer profile review/edit screen scaffold.
- `Features/Wants`: active wants list, detail/status view, and approval controls.

Recommended first integration points:

- `GET /health` for environment checks.
- `POST /wants` once the API has persistent want creation.
- Buyer profile endpoints after Greg lands phone auth and profile persistence.
