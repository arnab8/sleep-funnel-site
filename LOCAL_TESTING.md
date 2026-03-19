# Local Testing — Windows 11 PowerShell

## What you need (one-time setup)

You already have a plain HTTP server running in PowerShell — that's fine
for the HTML pages, but it can't run the Netlify Functions (MailerLite,
Facebook CAPI). For those you need **Netlify CLI**, which replaces your
HTTP server entirely and runs everything locally.

---

## Step 1 — Install Node.js (if not already)

Download from https://nodejs.org — pick the LTS version, run the installer.

Check it worked:
```powershell
node --version
npm --version
```
Both should print a version number.

---

## Step 2 — Install Netlify CLI

```powershell
npm install -g netlify-cli
```

Check it worked:
```powershell
netlify --version
```

---

## Step 3 — Fill in your tokens

Open `sleep-site/.env` in any text editor (Notepad is fine).
Replace the placeholder values with your real ones:

```
MAILERLITE_TOKEN=eyJ0eXAiOiJKV1Q...    ← paste your full MailerLite API token
CAPI_TOKEN=EAAxxxxxxx...                ← your Facebook CAPI token (already set in production)
```

The Group IDs and Pixel ID are already filled in — don't change them.

To get your MailerLite token:
→ MailerLite dashboard → Integrations → API → click your token to copy it

---

## Step 4 — Run locally

Stop your current HTTP server in PowerShell. Then:

```powershell
cd C:\path\to\sleep-site
netlify dev
```

Netlify CLI will print something like:
```
◈ Netlify Dev ◈
◈ Server listening on http://localhost:8888
```

Open **http://localhost:8888** in your browser.
Everything works exactly like the live site — forms, functions, Cal.com.

---

## Step 5 — Test MailerLite is working

**Test the lead flow:**
1. Go to `http://localhost:8888`
2. Fill in name, email, phone, pick a role
3. Click "Show Me My Number"
4. In the PowerShell window running `netlify dev`, you should see:
   ```
   MailerLite: lead — subscriber 123456 added to group 181902732134712797
   ```
5. In MailerLite → Subscribers → Groups → **sleep-funnel-lead**, the contact
   should appear with name, phone and role all filled in.

**Test the application flow:**
1. From the results page, click "Apply for Free Coaching"
2. Complete a booking on Cal.com
3. On redirect to `/congrats/`, PowerShell shows:
   ```
   MailerLite: apply — subscriber 123456 added to group 181902749742401428
   MailerLite: removed from lead group after application
   ```
4. In MailerLite, the contact should now be in **sleep-funnel-application**,
   removed from **sleep-funnel-lead**.

**Test UTM tracking:**
1. Go to `http://localhost:8888/?utm_source=facebook&utm_campaign=sleep_test`
2. Fill and submit the form
3. In MailerLite, open the subscriber — `utm_source` and `utm_campaign`
   should show the values.

---

## Before testing: create 2 custom fields in MailerLite

MailerLite won't accept unknown field keys. Create these first:

**MailerLite → Subscribers → Custom fields → Add field**

| Label        | Key (slug)    | Type |
|--------------|---------------|------|
| UTM Source   | `utm_source`  | Text |
| UTM Campaign | `utm_campaign`| Text |

`name`, `phone`, and `last_name` (used for role) are MailerLite built-in
fields — no setup needed for those.

---

## Verify Facebook CAPI is not broken

The CAPI function is completely unchanged. To confirm:
1. Run `netlify dev`
2. Submit the gate form
3. In PowerShell you'll see: `CAPI: Lead sent — events_received: 1`

If you want to test in Facebook Events Manager:
- Open `netlify/functions/capi.js`
- Uncomment the `test_event_code` line
- Restart `netlify dev`
- Submit a form and check Events Manager → Test Events
- Re-comment the line when done

---

## When ready to deploy

Add these to Netlify → Site Settings → Environment Variables:

```
MAILERLITE_TOKEN        = (your token)
MAILERLITE_GROUP_LEAD   = 181902732134712797
MAILERLITE_GROUP_APPLY  = 181902749742401428
```

PIXEL_ID and CAPI_TOKEN are already set there from before. Don't touch them.
Then deploy the zip as normal.

---

## Troubleshooting

**`netlify` is not recognised as a command**
→ Close PowerShell completely, reopen, try again.
   Or run: `$env:PATH += ";$env:APPDATA\npm"` then retry.

**Function returns 500 "Missing token"**
→ Your `.env` file has a placeholder, not a real token.
   Make sure it's in the root of `sleep-site/` (same folder as `netlify.toml`).

**MailerLite returns 422**
→ A field key doesn't exist in MailerLite yet.
   Create `utm_source` and `utm_campaign` custom fields (see above).

**MailerLite returns 401 Unauthorized**
→ Token is wrong or expired. Regenerate in MailerLite → Integrations → API.
