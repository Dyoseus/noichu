import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function FriendRequestsScreen({ onFriendAccepted }) {
  const [requests, setRequests] = useState([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;

      const q = query(collection(db, 'friendRequests'), where('to', '==', currentUser.uid), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const requestsList = [];

      querySnapshot.forEach((doc) => {
        requestsList.push({ id: doc.id, ...doc.data() });
      });

      setRequests(requestsList);
    };

    fetchRequests();
  }, [currentUser]);

  const handleAccept = async (request) => {
    try {
      const requestDocRef = doc(db, 'friendRequests', request.id);
      await updateDoc(requestDocRef, { status: 'accepted' });

      // Create friend relationship in both directions
      await setDoc(doc(db, 'friends', `${currentUser.uid}_${request.from}`), {
        userId: currentUser.uid,
        friendId: request.from,
        timestamp: new Date(),
      });
      await setDoc(doc(db, 'friends', `${request.from}_${currentUser.uid}`), {
        userId: request.from,
        friendId: currentUser.uid,
        timestamp: new Date(),
      });

      setRequests(requests.filter(req => req.id !== request.id));
      alert('Friend request accepted');
      if (typeof onFriendAccepted === 'function') {
        onFriendAccepted(); // Call the callback to indicate a friend was accepted
      }
    } catch (error) {
      alert('Failed to accept friend request: ' + error.message);
    }
  };

  const handleReject = async (request) => {
    try {
      await deleteDoc(doc(db, 'friendRequests', request.id));
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
            <Text style={styles.requestText}>From: {item.from}</Text>
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
    backgroundColor: '#f5E7B2',
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
