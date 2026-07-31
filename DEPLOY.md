# Deploying Family Finance to Netlify

The app is 5 static files (`index.html`, `manifest.json`, `sw.js`, `icon-192.png`,
`icon-512.png`), also bundled as `family-finance.zip`. No build step.

## First deploy (Netlify Drop — easiest, no CLI)

1. Go to **https://app.netlify.com/drop** in a browser on your Mac.
2. Drag either `family-finance.zip` **or** the whole `app` folder onto the page.
   → You get a live URL like `https://<random-name>.netlify.app` in ~10 seconds.
3. **Click "Claim / Sign up"** (Google or email) — without an account the site
   expires in ~1 hour. With one, it's free and permanent.
4. Optional: **Site configuration → Change site name** → e.g. `aggarwal-finance`
   → URL becomes `https://aggarwal-finance.netlify.app`.

## Install on iPhone

1. Open the `https://…netlify.app` link in **Safari** (Wi-Fi or cellular).
2. **Share → Add to Home Screen.**
3. Do the same on the second phone.
4. On both phones: **Sync tab** → Phone 1 sets a PIN and taps *Create household*
   → share the code + PIN → Phone 2 pastes them and taps *Join household*.

## Updating later

Netlify dashboard → your site → **Deploys** tab → drag the updated folder/zip
onto the deploy drop area. Same URL, live in seconds, no reinstall needed.

To regenerate the zip after code changes:
```
cd /Users/vaggarwal6/app
zip -j family-finance.zip index.html manifest.json sw.js icon-192.png icon-512.png
```

## Notes

- The Supabase URL + publishable key are baked into `index.html`. That is safe —
  they are public by design; the data is protected by Row Level Security + PIN.
- Never put the Supabase **service_role / secret** key in these files.
- Sync is opt-in: the app is local-only until someone creates/joins a household.
