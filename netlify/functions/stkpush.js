// netlify/functions/stkpush.js
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
    const { phone, amount, accountReference } = body;

    if(!phone || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: 'phone and amount required' }) };
    }

    // Environment configuration
    const SHORTCODE = process.env.SHORTCODE || '174379';
    const PASSKEY = process.env.PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const CONSUMER_KEY = process.env.CONSUMER_KEY;
    const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
    const CALLBACK_URL = process.env.CALLBACK_URL || `https://${process.env.SITE_DOMAIN || 'siato.netlify.app'}/.netlify/functions/callback`;
    const DARaja_BASE = (process.env.ENVIRONMENT === 'production') ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

    if(!CONSUMER_KEY || !CONSUMER_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing Daraja credentials in environment' }) };
    }

    // 1. get access token
    const tokenRes = await axios.get(`${DARaja_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
      timeout: 10000
    });
    const accessToken = tokenRes.data.access_token;

    // 2. timestamp & password
    const timestamp = getTimestamp();
    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    // 3. STK Push
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference || "TFXG_STORE",
      TransactionDesc: accountReference || "TFXG Purchase"
    };

    const stkRes = await axios.post(`${DARaja_BASE}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000
    });

    // Return Daraja's acknowledgement to client
    return {
      statusCode: 200,
      body: JSON.stringify(stkRes.data)
    };
  } catch (err) {
    console.error('stkpush error', err.response?.data || err.message || err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.response?.data || err.message || 'STK push failed' })
    };
  }
};
