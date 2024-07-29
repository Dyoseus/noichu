const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
admin.initializeApp();

const db = admin.firestore();

// Twilio Credentials from the Twilio Console
const accountSid = 'ACd1e362ef3b0585af6bb47f6f28f9b7a4';
const authToken = '3622e455a64b4648fcb6ed832e2e4730';

// Create a Twilio client
const client = twilio(accountSid, authToken);

exports.getTwilioToken = functions.https.onCall(async (data, context) => {
  try {
    const token = await client.tokens.create();
    return {
      iceServers: token.iceServers,
    };
  } catch (error) {
    console.error('Error creating Twilio token:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create Twilio token');
  }
});

exports.findMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }
  const userData = userDoc.data();

  const queueRef = db.collection('matchQueue').doc(userId);
  await queueRef.set({
    userId: userId,
    gender: userData.gender,
    interestedIn: userData.interestedIn,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Listen for matches (this will be handled client-side)
  return { success: true };
});

exports.leaveCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;
  const { callId } = data;

  if (!callId) {
    throw new functions.https.HttpsError('invalid-argument', 'Call ID is required.');
  }

  const callRef = db.collection('calls').doc(callId);
  await callRef.update({
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Remove user from matchQueue
  await db.collection('matchQueue').doc(userId).delete();

  return { success: true };
});