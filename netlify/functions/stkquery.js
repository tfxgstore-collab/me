// netlify/functions/stkquery.js
const axios = require('axios');

function getTimestamp() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  const hh = String(d.getUTCHours()).padStart(2,'0');
  const min = String(d.getUTCMinutes()).padStart(2,'0');
  const ss = String(d.getUTCSeconds()).padStart(2,'0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const checkoutId = body.checkoutId || body.CheckoutRequestID || body.checkoutRequestID;
    if(!checkoutId) return { statusCode:400, body: JSON.stringify({ error:'checkoutId required' }) };

    const SHORTCODE = process.env.SHORTCODE || '174379';
    const PASSKEY = process.env.PASSKEY;
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    const DARaja_BASE = (process.env.ENVIRONMENT === 'production') ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    if(!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY) {
      return { statusCode:500, body: JSON.stringify({ error:'Missing environment credentials' }) };
    }

    // get token
    const tokenRes = await axios.get(`${DARaja_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
    });
    const accessToken = tokenRes.data.access_token;

    const timestamp = getTimestamp();
    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutId
    };

    const queryRes = await axios.post(`${DARaja_BASE}/mpesa/stkpushquery/v1/query`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // queryRes.data will contain ResultCode / ResultDesc if processed
    return { statusCode:200, body: JSON.stringify(queryRes.data) };

  } catch (err) {
    console.error('stkquery error', err.response?.data || err.message || err);
    return { statusCode:500, body: JSON.stringify({ error: err.response?.data || err.message }) };
  }
};
