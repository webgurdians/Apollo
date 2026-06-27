const crypto = require('crypto');

const payload = {
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_xyz123abc456",
        amount: 50000,
        contact: "+919876543210",
        notes: {
          name: "John Doe",
          service: "General Consultation"
        }
      }
    }
  }
};

const payloadString = JSON.stringify(payload);
const secret = "apollo_secret_123";

const signature = crypto
  .createHmac('sha256', secret)
  .update(payloadString)
  .digest('hex');

fetch('http://localhost:4000/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature
  },
  body: payloadString
})
.then(res => res.text())
.then(console.log)
.catch(console.error);
