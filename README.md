# Sleep Calculator — Deployment Guide
# sleep.respondunderpressure.com

## Folder Structure
```
sleep-site/
├── index.html                  ← Main calculator + gate page
├── apply/
│   └── index.html              ← Booking page (Cal.com embed)
├── congrats/
│   └── index.html              ← Post-booking confirmation
├── netlify/
│   └── functions/
│       └── capi.js             ← Facebook CAPI serverless function
├── netlify.toml                ← Netlify config
└── README.md
```

---

## Step 1 — Add your Facebook Pixel ID

In all three HTML files, find and replace:
  YOUR_PIXEL_ID → your actual pixel ID (e.g. 1234567890123456)

VS Code: Ctrl+Shift+H → search YOUR_PIXEL_ID → replace all

---

## Step 2 — Deploy to Netlify

Option A — Drag and drop:
  Go to app.netlify.com → Add new site → Deploy manually
  Drag the entire sleep-site/ folder into the deploy zone

Option B — Git (recommended for ongoing updates):
  1. Push sleep-site/ to a GitHub repo
  2. In Netlify: Add new site → Import from Git → select repo
  3. Build command: leave blank
  4. Publish directory: . (dot — root of repo)
  5. Deploy

---

## Step 3 — Set Environment Variables

In Netlify → Site Settings → Environment Variables → Add:

  PIXEL_ID    = your Facebook Pixel ID
  CAPI_TOKEN  = your CAPI access token (see below)

Getting your CAPI token:
  Facebook Events Manager → your pixel → Settings → 
  Conversions API → Generate access token → copy it

---

## Step 4 — Add Custom Domain

In Netlify → Site Settings → Domain Management → Add custom domain:
  Type: sleep.respondunderpressure.com

Then in your DNS provider (where respondunderpressure.com is managed):
  Add CNAME record:
    Name:  sleep
    Value: your-netlify-site.netlify.app
    TTL:   3600 (or Auto)

SSL is handled automatically by Netlify (Let's Encrypt).

---

## Step 5 — Test CAPI

To verify CAPI is working before going live:
  1. In capi.js, uncomment the line: test_event_code: 'TEST12345'
  2. Deploy
  3. Submit a test form on the live site
  4. Go to Events Manager → your pixel → Test Events
  5. You should see the events appear
  6. Re-comment the test_event_code line and redeploy

---

## Facebook Event Flow

Page                          | Events fired
------------------------------|------------------------------------------
/ (calculator gate)           | PageView (pixel)
/ (after gate submit)         | Lead (pixel + CAPI)
/apply/                       | PageView (pixel)
/apply/ (after Cal booking)   | SubmitApplication (pixel + CAPI)
/congrats/                    | PageView (pixel) + SubmitApplication (pixel fallback)

---

## Google Sheets Webhook

Already wired to:
https://script.google.com/macros/s/AKfycbwhjTvf3ip_EHQ1gQIpUAUjMfgauW3HPQxtpaL2OFAr0DY6017Qol2hEQBRnLM4oruoWw/exec

Sheet columns (A→N):
Timestamp | Name | Email | Phone | Role | Sleep Debt | Cognitive Impairment | 
Recovery Days | Weeknight Sleep | Target Sleep | Triggers | Duration | Tried Before | Performance Impact

---

## Admin Dashboard

Access: https://sleep.respondunderpressure.com/?admin=rup2024
(Direct URL — no visible button anywhere on the site)
