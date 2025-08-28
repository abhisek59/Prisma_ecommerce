// backend/utils/paypal.js
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';

// Creating an environment
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const environment = process.env.NODE_ENV === 'production'
    ? new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);

const client = new checkoutNodeJssdk.core.PayPalHttpClient(environment);

export { client };