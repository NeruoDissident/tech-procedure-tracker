# Technician Procedure Helper

A mobile-first, personal technician checklist with Walmart-inspired blue and yellow styling. Independent personal tool; not an official Walmart application.

## Use

Select a technician, enter a numeric ticket (or choose a recent one), select a service, and answer whether procedures were performed correctly. A No answer requires details. Done saves the completed form and opens a fresh checklist.

Every field change saves synchronously to localStorage. Opening or refreshing the app starts with a fresh form; unfinished forms are preserved and available from the resume banner or Options. Completed forms can be reviewed, copied, exported as CSV, and marked as transferred. Transferred is a personal flag; it does not send anything to Walmart.

Options also manages technicians (alphabetically sorted) and downloads/restores JSON backups. Removing a technician preserves their existing records. Restore merges technicians and adds missing record IDs without overwriting existing records.

## Storage and mobile

No account, server database, tracking, or Walmart integration. Data belongs to this browser and website address. It does not sync between devices. Browser data removal, private browsing, storage eviction, or a change of hostname can remove access to records. Download backups regularly and restore on another device/address as needed. Save failure is shown prominently and completion is blocked when saving fails.

The service worker caches the app for offline use after the first successful online load. Open once online and allow it to finish loading before working offline. Add to Home Screen using Safari's Share menu on iPhone/iPad or the browser's install menu on Android. Numeric input requests the system numeric keypad; exact keyboard appearance depends on the device/browser.

## Local preview

Requires Node.js; no dependencies to install.

```sh
npm start
```

Open http://127.0.0.1:4173. Run `npm run check` for JavaScript syntax checks.

## Vercel

Import this GitHub repository into Vercel. Use framework preset **Other**, no build command and the repository root (`.`) as the output directory. The included `vercel.json` configures static deployment. No environment variables are required. Use the stable production URL for actual data entry; preview URLs have separate browser storage.

## Files

`index.html`, `styles.css`, and `app.js` implement the interface. `sw.js` provides offline caching. `manifest.webmanifest` and `icon.svg` support installation. `server.cjs` is only for local preview; Vercel serves static assets.
