const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');
admin.initializeApp();

const db = admin.database();

// Twilio Credentials from the Twilio Console
const accountSid = functions.config().twilio.accountsid; 
const authToken = functions.config().twilio.authtoken;

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

exports.enterQueue = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;

  const userSnapshot = await admin.firestore().collection('users').doc(userId).get();
  if (!userSnapshot.exists) {
    throw new functions.https.HttpsError('not-found', 'User profile not found.');
  }
  const userData = userSnapshot.data();

  const queueRef = db.ref('matchQueue').child(userId);
  await queueRef.set({
    userId: userId,
    gender: userData.gender,
    interestedIn: userData.interestedIn,
    timestamp: admin.database.ServerValue.TIMESTAMP,
  });

  return { success: true };
});

exports.leaveQueue = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;
  await db.ref('matchQueue').child(userId).remove();

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

  const callRef = admin.firestore().collection('calls').doc(callId);
  await callRef.update({
    ended: true,
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

exports.findMatch = functions.database.ref('/matchQueue/{userId}').onCreate(async (snapshot, context) => {
  const newUser = snapshot.val();
  const newUserId = context.params.userId;

  const matchQueueRef = db.ref('matchQueue');
  const matchQueueSnapshot = await matchQueueRef.orderByChild('timestamp').once('value');

  let match = null;
  matchQueueSnapshot.forEach((childSnapshot) => {
    const potentialMatch = childSnapshot.val();
    if (potentialMatch.userId !== newUserId &&
        potentialMatch.gender === newUser.interestedIn[0] &&
        potentialMatch.interestedIn.includes(newUser.gender)) {
      match = potentialMatch;
      return true; // Stop the forEach loop
    }
  });

  if (match) {
    const callId = [newUserId, match.userId].sort().join('_');
    const callRef = admin.firestore().collection('calls').doc(callId);

    await callRef.set({
      users: [newUserId, match.userId],
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'connecting'
    });

    // Remove both users from the queue
    await matchQueueRef.child(newUserId).remove();
    await matchQueueRef.child(match.userId).remove();

    // Update past matches for both users in Firestore
    await admin.firestore().collection('users').doc(newUserId).update({
      pastMatches: admin.firestore.FieldValue.arrayUnion(match.userId)
    });
    await admin.firestore().collection('users').doc(match.userId).update({
      pastMatches: admin.firestore.FieldValue.arrayUnion(newUserId)
    });

    // Notify both users about the match
    await db.ref(`userMatches/${newUserId}`).set({ matchedWith: match.userId, callId });
    await db.ref(`userMatches/${match.userId}`).set({ matchedWith: newUserId, callId });
  }
});