const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
admin.initializeApp();

const db = admin.firestore();


// Twilio Credentials from the Twilio Console
const accountSid = functions.config().twilio.accountsid; 
const authToken = functions.config().twilio.authtoken;

// Create a Twilio client
const client = twilio(accountSid, authToken);

// Cloud Function to generate Twilio token
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

  // Find a waiting user
  const queueSnapshot = await db.collection('queue')
    .where('status', '==', 'waiting')
    .where('userId', '!=', userId)
    .limit(1)
    .get();

  let callDocId;

  if (queueSnapshot.empty) {
    // No waiting users, add this user to queue
    const newQueueDoc = await db.collection('queue').add({
      userId: userId,
      status: 'waiting',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    callDocId = newQueueDoc.id;
  } else {
    // Match found
    const matchDoc = queueSnapshot.docs[0];
    callDocId = matchDoc.id;
    
    // Update the matched document
    await matchDoc.ref.update({
      status: 'matched',
      matchedUserId: userId
    });
  }

  return { callDocId, status: queueSnapshot.empty ? 'waiting' : 'matched' };
});

exports.leaveCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;
  const { callDocId } = data;

  if (!callDocId) {
    throw new functions.https.HttpsError('invalid-argument', 'Call document ID is required.');
  }

  const callDoc = await db.collection('queue').doc(callDocId).get();

  if (!callDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Call document not found.');
  }

  // Update call status
  await callDoc.ref.update({ status: 'ended' });

  return { success: true };
});

