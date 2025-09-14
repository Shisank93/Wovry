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

// 3. sendWelcomeEmail:
//    - Triggered when a new document is created in 'newsletterSubscribers'.
//    - Sends a welcome email to the new subscriber.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
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

// --- Email Function for Newsletter Subscription ---
// To make this function work, you need to configure your email service credentials
// in the Firebase environment. From your terminal, run:
// firebase functions:config:set email.user="YOUR_EMAIL_ADDRESS" email.pass="YOUR_EMAIL_PASSWORD_OR_APP_KEY"
// For Gmail, you may need to use an "App Password".
// For services like SendGrid, use the API key as the password.

const mailTransport = nodemailer.createTransport({
    // Example using Gmail. Replace with your email service provider.
    service: 'gmail',
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.pass,
    },
});

exports.sendWelcomeEmail = functions.firestore
    .document('newsletterSubscribers/{subscriberId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const email = data.email;

        if (!email) {
            console.log("Subscriber document is missing email field.");
            return;
        }

        const mailOptions = {
            from: '"Knit & Purl" <noreply@yourdomain.com>', // Use a custom sending address
            to: email,
            subject: 'Welcome to the Knit & Purl Family!',
            html: `
                <h1>Welcome!</h1>
                <p>Hi there,</p>
                <p>Thank you for subscribing to the Knit & Purl newsletter. We're so happy to have you with us.</p>
                <p>You'll now be the first to know about new arrivals, special collections, and exclusive offers.</p>
                <p>Happy knitting!</p>
                <br>
                <p>Warmly,</p>
                <p>The Knit & Purl Team</p>
            `
        };

        try {
            await mailTransport.sendMail(mailOptions);
            console.log(`Successfully sent welcome email to ${email}`);
        } catch (error) {
            console.error('There was an error sending the email:', error);
        }
    });

// --- Admin Dashboard Functions ---

// HTTP-callable function to list all users.
// This function is protected and can only be called by an authenticated admin.
exports.listUsers = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Check for authentication token
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            return res.status(403).send('Unauthorized: No token provided.');
        }

        // Verify the admin's token
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            // Hardcoded Admin UID for security check
            const ADMIN_UID = "QHnSW6f3BjZqJ13Hkw35fgg5AcJ2";
            if (decodedToken.uid !== ADMIN_UID) {
                return res.status(403).send('Unauthorized: Not an admin.');
            }
        } catch (error) {
            console.error("Error verifying auth token:", error);
            return res.status(403).send('Unauthorized: Invalid token.');
        }

        // If authorized, list users
        try {
            const listUsersResult = await admin.auth().listUsers(1000); // Max 1000 users per page
            const users = listUsersResult.users.map(user => ({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                creationTime: user.metadata.creationTime,
                lastSignInTime: user.metadata.lastSignInTime,
            }));
            res.status(200).send(users);
        } catch (error) {
            console.error('Error listing users:', error);
            res.status(500).send({ error: 'Failed to list users.' });
        }
    });
});
