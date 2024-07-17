import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function FriendRequestsScreen({ refresh, onFriendAccepted }) {
  const [requests, setRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;

      const q = firestore().collection('friendRequests')
        .where('to', '==', currentUser.uid)
        .where('status', '==', 'pending');

      const querySnapshot = await q.get();
      const requestsList = [];

      for (const docSnapshot of querySnapshot.docs) {
        const request = docSnapshot.data();
        const fromUserDoc = await firestore().collection('users').doc(request.from).get();
        if (fromUserDoc.exists) {
          requestsList.push({
            id: docSnapshot.id,
            from: request.from,
            fromUsername: fromUserDoc.data().username,
          });
        }
      }

      setRequests(requestsList);
    };

    if (currentUser) {
      fetchRequests();
    }
  }, [currentUser, refresh]);

  useEffect(() => {
    if (!currentUser) return;

    const q = firestore().collection('friendRequests')
      .where('to', '==', currentUser.uid)
      .where('status', '==', 'pending');

    const unsubscribe = q.onSnapshot(async (snapshot) => {
      const requestsList = [];
      for (const docSnapshot of snapshot.docs) {
        const request = docSnapshot.data();
        const fromUserDoc = await firestore().collection('users').doc(request.from).get();
        if (fromUserDoc.exists) {
          requestsList.push({
            id: docSnapshot.id,
            from: request.from,
            fromUsername: fromUserDoc.data().username,
          });
        }
      }
      setRequests(requestsList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAccept = async (request) => {
    try {
      const requestDocRef = firestore().collection('friendRequests').doc(request.id);
      await requestDocRef.update({ status: 'accepted' });

      // Creates friend relationship in both directions (using new friends collection structure)
      await firestore().collection('friends').doc(`${currentUser.uid}_${request.from}`).set({
        user1: currentUser.uid,
        user2: request.from,
        timestamp: new Date(),
        status: 'accepted',
      });

      setRequests(requests.filter(req => req.id !== request.id));
      alert('Friend request accepted');
      if (typeof onFriendAccepted === 'function') {
        onFriendAccepted(); // Call on the callback to indicate a friend was accepted
      }
    } catch (error) {
      alert('Failed to accept friend request: ' + error.message);
    }
  };

  const handleReject = async (request) => {
    try {
      await firestore().collection('friendRequests').doc(request.id).delete();
      setRequests(requests.filter(req => req.id !== request.id));
      alert('Friend request rejected');
    } catch (error) {
      alert('Failed to reject friend request: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestContainer}>
            <Text style={styles.requestText}>From: {item.fromUsername}</Text>
            <Button title="Accept" onPress={() => handleAccept(item)} />
            <Button title="Reject" onPress={() => handleReject(item)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#232323',
  },
  requestContainer: {
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  requestText: {
    fontSize: 16,
    fontFamily: 'sans-serif',
    marginBottom: 10,
  },
});
