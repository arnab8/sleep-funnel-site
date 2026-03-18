// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function: mailerlite.js
// Adds/updates a subscriber in MailerLite and manages group membership.
//
// SETUP (Netlify env vars):
//   MAILERLITE_TOKEN          = your MailerLite API token
//   MAILERLITE_GROUP_LEAD     = 181902732134712797   (sleep-funnel-lead)
//   MAILERLITE_GROUP_APPLY    = 181902749742401428   (sleep-funnel-application)
//
// Called with:
//   { action: 'lead' | 'apply', name, email, phone, role,
//     utm_source, utm_campaign }
// ─────────────────────────────────────────────────────────────────────────────

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const TOKEN     = process.env.MAILERLITE_TOKEN;
  const GROUP_LEAD  = process.env.MAILERLITE_GROUP_LEAD  || '181902732134712797';
  const GROUP_APPLY = process.env.MAILERLITE_GROUP_APPLY || '181902749742401428';

  if (!TOKEN) {
    console.error('MailerLite: Missing MAILERLITE_TOKEN');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing token' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    action = 'lead',   // 'lead' or 'apply'
    name, email, phone, role,
    utm_source, utm_campaign
  } = body;

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) };
  }

  const groupId = action === 'apply' ? GROUP_APPLY : GROUP_LEAD;

  // ── Build subscriber payload ─────────────────────────────────────────────
  // name/phone/last_name are MailerLite built-in fields.
  // utm_source + utm_campaign must be created as custom fields in MailerLite
  // (Subscribers → Custom fields → Add field, type: Text)
  const fields = {};
  if (name)         fields.name         = name;          // built-in
  if (phone)        fields.phone        = phone;         // built-in
  if (role)         fields.last_name    = role;          // built-in (repurposed)
  if (utm_source)   fields.utm_source   = utm_source;    // custom field
  if (utm_campaign) fields.utm_campaign = utm_campaign;  // custom field

  const payload = {
    email,
    fields,
    groups: [groupId],
    status: 'active',
    resubscribe: true   // re-activates unsubscribed contacts from ads
  };

  try {
    // Upsert subscriber (creates or updates)
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('MailerLite error:', JSON.stringify(result));
      return { statusCode: 502, body: JSON.stringify({ error: 'MailerLite API error', detail: result }) };
    }

    const subscriberId = result.data?.id;
    console.log(`MailerLite: ${action} — subscriber ${subscriberId} added to group ${groupId}`);

    // If this is an application, also remove from lead group (clean segmentation)
    if (action === 'apply' && subscriberId) {
      try {
        await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${GROUP_LEAD}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Accept': 'application/json'
          }
        });
        console.log(`MailerLite: removed from lead group after application`);
      } catch(e) {
        console.warn('MailerLite: could not remove from lead group:', e.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: subscriberId }) };

  } catch(err) {
    console.error('MailerLite fetch error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
