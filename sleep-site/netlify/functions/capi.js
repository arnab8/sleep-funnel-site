// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function: capi.js
// Mirrors browser pixel events to Facebook via Conversions API (server-side)
//
// SETUP:
//   1. In Netlify → Site Settings → Environment Variables, add:
//        PIXEL_ID    = your Facebook Pixel ID  (e.g. 1234567890)
//        CAPI_TOKEN  = your CAPI access token  (from Events Manager → Settings)
//
//   2. Deploy — Netlify auto-detects functions in /netlify/functions/
//
// EVENT DEDUPLICATION:
//   Both browser pixel and CAPI fire for the same event.
//   Facebook deduplicates using event_id. We generate one here and the
//   browser should pass the same event_id when calling fbq() — see README.
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async function(event, context) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const PIXEL_ID   = process.env.PIXEL_ID;
  const CAPI_TOKEN = process.env.CAPI_TOKEN;

  if (!PIXEL_ID || !CAPI_TOKEN) {
    console.error('CAPI: Missing PIXEL_ID or CAPI_TOKEN env vars');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    event_name,    // 'Lead' | 'SubmitApplication' | 'PageView'
    custom_data,   // object with content_name etc.
    url,           // page URL where event fired
    email_hash,    // SHA256 of lowercased trimmed email (done in browser)
    phone_hash,    // SHA256 of digits-only phone (done in browser)
    user_agent,    // navigator.userAgent from browser
    fbc,           // _fbc cookie value
    fbp,           // _fbp cookie value
    event_id,      // optional dedup ID — pass same value to fbq()
  } = body;

  // Build user_data — only include fields that exist
  const user_data = { client_user_agent: user_agent || 'unknown' };
  if (email_hash)  user_data.em  = [email_hash];
  if (phone_hash)  user_data.ph  = [phone_hash];
  if (fbc)         user_data.fbc = fbc;
  if (fbp)         user_data.fbp = fbp;

  const payload = {
    data: [{
      event_name:       event_name,
      event_time:       Math.floor(Date.now() / 1000),
      event_source_url: url || `https://sleep.respondunderpressure.com`,
      action_source:    'website',
      user_data,
      custom_data:      custom_data || {},
      ...(event_id ? { event_id } : {})
    }],
    // test_event_code: 'TEST71716'  // ← uncomment to test in Events Manager
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    );

    const result = await res.json();

    if (!res.ok) {
      console.error('CAPI FB error:', JSON.stringify(result));
      return { statusCode: 502, body: JSON.stringify({ error: 'FB API error', detail: result }) };
    }

    console.log(`CAPI: ${event_name} sent — events_received: ${result.events_received}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, events_received: result.events_received }) };

  } catch(err) {
    console.error('CAPI fetch error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
