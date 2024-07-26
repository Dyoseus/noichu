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

  // Get the current user's profile
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }
  const userProfile = userDoc.data();

  // Determine the gender and interest for matching
  const userGender = userProfile.gender;
  const interestedIn = userProfile.interestedIn;

  if (!userGender || !interestedIn) {
    throw new functions.https.HttpsError('failed-precondition', 'User profile must include gender and interest.');
  }

  // **BEGIN TRANSACTION**
  return db.runTransaction(async (transaction) => { 
    // Query for a matching user within the transaction
    const queueSnapshot = await transaction.get(
      db.collection('queue')
        .where('status', '==', 'waiting')
        .where('userId', '!=', userId)
        .where('gender', '==', interestedIn)
        .where('interestedIn', '==', userGender)
        .limit(1)
    );

    let callDocId;

    if (queueSnapshot.empty) {
      // No match found, add the current user to the queue
      const newQueueDoc = db.collection('queue').doc(); // Generate a new document ID
      callDocId = newQueueDoc.id;
      transaction.set(newQueueDoc, {
        userId: userId,
        status: 'waiting',
        gender: userGender,
        interestedIn: interestedIn,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Match found!
      const matchDoc = queueSnapshot.docs[0];
      callDocId = matchDoc.id;

      // Update the matched user's status atomically
      transaction.update(matchDoc.ref, {
        status: 'matched',
        matchedUserId: userId,
      });
    }

    // Return the callDocId and status
    return { callDocId, status: queueSnapshot.empty ? 'waiting' : 'matched' };

  // **END TRANSACTION**
  }).catch((error) => { 
    // Handle transaction errors
    console.error('Transaction failed:', error);
    throw new functions.https.HttpsError('internal', 'Matching failed. Please try again.');
  }); 
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

