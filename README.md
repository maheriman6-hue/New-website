# Zateef Portfolio
```

This project is a Next.js portfolio inspired by the provided reference. It implements the fixed chrome, dark/red palette, page shell, route transition, and basic route scaffolding for Home, Work, About, and Contact.

## Run locally

```bash
cd "D:\New Website"
npm install
npm run dev -- --hostname 0.0.0.0
```

Open http://localhost:3000

The regular `npm run dev` server uses HTTP. To use HTTPS instead, stop that dev server with `Ctrl + C`, then run:

```bash
npm run dev:lan-https
```

Open https://192.168.1.44:3000. Only one Next.js dev server can run for this project at a time. If you need to keep the current server running, continue using http://192.168.1.44:3000; do not use an `https://` URL with it. If your LAN IP changes, update the hostname in the `dev:lan-https` script in `package.json`. Next.js generates a local certificate; trust it on each device that opens the site. If Next.js reports that certificate generation failed and falls back to HTTP, HTTPS is not active and the local certificate setup must be fixed before using an `https://` URL.

## Firebase

The app is connected to the `zateef-website` Firebase project. `.firebaserc` selects that project for Firebase CLI commands, and `firebase.json` points to the local security rules. Copy `.env.local.example` to `.env.local` and fill in the Firebase web app configuration from Firebase Console → Project settings → General → Your apps, plus the owner email. The client SDK is initialized in `lib/firebase.ts`; import `db`, `auth`, or `storage` only in client components. `.env.local` is ignored by Git.

The Firebase web configuration is used by browser code and is not a service-account secret. Enable Email/Password in Firebase Authentication and set `NEXT_PUBLIC_OWNER_EMAIL` to the exact email of the owner account you create there. That account can sign in with its Firebase password without verifying its email; other Firebase accounts are rejected. Firestore Security Rules enforce the same owner-email check and the one-hour maximum session age.

The current Work examples are in the Products catalog and can be edited from the admin panel. Public catalog reads are limited to visible categories, subcategories, products, and media. Firebase Storage uploads fall back to a small Firestore data URL if Storage is unavailable.

## Stop

Press `Ctrl + C` in the terminal.
