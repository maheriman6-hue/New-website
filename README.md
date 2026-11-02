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

## Stop

Press `Ctrl + C` in the terminal.