// FriendsListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function FriendsListScreen({ refresh, onFriendRemoved }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;
  
      const q1 = query(collection(db, 'friends'), where('user1', '==', currentUser.uid), where('status', '==', 'accepted'));
      const q2 = query(collection(db, 'friends'), where('user2', '==', currentUser.uid), where('status', '==', 'accepted'));
      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const friendsList = [];
  
      // Using for...of loop for snapshot1
      for (const docSnapshot of snapshot1.docs) {
        const friendData = docSnapshot.data();
        const friendDoc = doc(db, 'users', friendData.user2);
        const friendDocSnapshot = await getDoc(friendDoc);
        if (friendDocSnapshot.exists()) {
          friendsList.push({
            id: friendData.user2,
            username: friendDocSnapshot.data().username,
          });
        }
      }
  
      // Using for...of loop for snapshot2
      for (const docSnapshot of snapshot2.docs) {
        const friendData = docSnapshot.data();
        const friendDoc = doc(db, 'users', friendData.user1);
        const friendDocSnapshot = await getDoc(friendDoc);
        if (friendDocSnapshot.exists()) {
          friendsList.push({
            id: friendData.user1,
            username: friendDocSnapshot.data().username,
          });
        }
      }
  
      setFriends(friendsList);
    };
  
    fetchFriends();
  }, [currentUser, refresh]);

  useEffect(() => {
    const q = query(collection(db, 'friends'), where('user1', '==', currentUser.uid), where('status', '==', 'accepted'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsList = [];
      for (const docSnapshot of snapshot.docs) {
        const friendData = docSnapshot.data();
        const friendDoc = await getDoc(doc(db, 'users', friendData.user2));
        if (friendDoc.exists()) {
          friendsList.push({
            id: friendData.user2,
            username: friendDoc.data().username,
          });
        }
      }
      setFriends(friendsList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleRemoveButtonPress = (friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
  };

  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;

    try {
      // Remove friend relationship
      await deleteDoc(doc(db, 'friends', `${currentUser.uid}_${selectedFriend.id}`));

      setFriends(friends.filter(friend => friend.id !== selectedFriend.id));
      setModalVisible(false);
      setSelectedFriend(null);
      alert('Friend removed successfully');
      if (typeof onFriendRemoved === 'function') {
        onFriendRemoved(); // Call the callback to indicate a friend was removed
      }
    } catch (error) {
      alert('Failed to remove friend: ' + error.message);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedFriend(null);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.friendContainer}>
            <Text style={styles.friendText}>{item.username}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveButtonPress(item)}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {selectedFriend && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Remove friend {selectedFriend.username}?</Text>
              <Button title="Remove" onPress={handleRemoveFriend} />
              <Button title="Cancel" onPress={closeModal} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#232323',
  },
  friendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  friendText: {
    fontSize: 16,
    fontFamily: 'sans-serif',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    padding: 8,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    fontFamily: 'sans-serif',
  },
});