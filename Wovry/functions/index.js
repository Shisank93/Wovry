// This file will contain our secure, server-side Cloud Functions.

// 1. createCheckoutSession:
//    - Triggered by a request from our website's checkout page.
//    - Receives cart data.
//    - Uses the Stripe SDK to create a new checkout session.
//    - Returns the session ID to the client.

// 2. stripeWebhook:
//    - Triggered by events from Stripe's servers.
//    - Listens for successful payment events.
//    - Updates the order status in Firestore to 'paid'.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Stripe with the secret key from Firebase environment configuration
const stripe = require("stripe")(functions.config().stripe.secret);
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Function to create a Stripe Checkout session
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method Not Allowed' });
        }

        try {
            const { items, customerInfo } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).send({ error: 'Invalid cart data.' });
            }

            const lineItems = items.map(item => {
                return {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: item.name,
                            images: [item.imageUrl],
                        },
                        unit_amount: Math.round(item.price * 100), // Price in smallest currency unit (paise)
                    },
                    quantity: item.quantity,
                };
            });

            // Create a preliminary order in Firestore with 'pending' status
            const orderRef = await admin.firestore().collection('orders').add({
                ...customerInfo,
                items: items,
                total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: `${req.headers.origin}/Wovry/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/Wovry/payment-cancel.html`,
                metadata: {
                    orderId: orderRef.id
                }
            });

            res.status(200).send({ id: session.id });

        } catch (error) {
            console.error("Error creating Stripe checkout session:", error);
            res.status(500).send({ error: 'Failed to create checkout session.' });
        }
    });
});

// Stripe webhook to handle successful payments
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    // Get the webhook signing secret from Firebase environment configuration
    const endpointSecret = functions.config().stripe.webhook_secret;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;

        if (!orderId) {
            console.error("Webhook received but no orderId in metadata.", session);
            return res.status(400).send('Webhook Error: Missing orderId in session metadata.');
        }

        try {
            // Update the order status in Firestore
            const orderRef = admin.firestore().collection('orders').doc(orderId);
            await orderRef.update({ status: 'paid' });
            console.log(`Successfully updated order ${orderId} to paid.`);

            // Optional: Send a confirmation email to the customer here

        } catch (dbError) {
            console.error(`Failed to update order ${orderId} in database.`, dbError);
            // We return a 200 status even on DB error to prevent Stripe from resending
            // the webhook, which could cause other issues. We will rely on logs to fix this.
        }
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send();
});
