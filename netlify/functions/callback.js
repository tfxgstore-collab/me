// netlify/functions/callback.js
exports.handler = async (event) => {
  try {
    // Daraja sends JSON body with Body.stkCallback
    const body = JSON.parse(event.body || '{}');
    console.log('MPESA CALLBACK RECEIVED:', JSON.stringify(body).slice(0,2000));
    // You should verify and persist this to DB (recommended) — for now we just acknowledge.

    // Optionally return 200 with result to MPESA system
    return {
      statusCode: 200,
      body: JSON.stringify({ ResultCode: 0, ResultDesc: "Callback received successfully" })
    };
  } catch (err) {
    console.error('callback error', err);
    return { statusCode:500, body: JSON.stringify({ error: 'callback handler error' }) };
  }
};
