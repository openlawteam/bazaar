# Bazaar iOS

Owned by Suvina.

This folder is reserved for the SwiftUI app. The app should focus on account management, buyer profile editing, active wants, approvals, and notification/widget surfaces. It should not duplicate the SMS conversation loop.

Recommended first integration points:

- `GET /health` for environment checks.
- `POST /wants` once the API has persistent want creation.
- Buyer profile endpoints after Greg lands phone auth and profile persistence.

Do not treat this folder as generated app scaffolding yet. Suvina can create the Xcode project here using her preferred SwiftUI setup.
