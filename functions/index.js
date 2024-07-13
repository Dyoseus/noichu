const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.findMatch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = context.auth.uid;

  // Check if user is already in a call
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists && userDoc.data().inCall) {
    throw new functions.https.HttpsError('failed-precondition', 'User is already in a call.');
  }

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

  // Update user's status
  await db.collection('users').doc(userId).update({ inCall: true });

  return { callDocId };
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

  // Clean up user status
  await db.collection('users').doc(userId).update({ inCall: false });

  return { success: true };
});