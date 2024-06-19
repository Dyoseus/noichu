import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function FriendsListScreen({ refresh }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      console.log('Fetching friends list...'); // Log to check when fetching occurs

      const q = query(collection(db, 'friends'), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const friendsList = [];

      for (const docSnapshot of querySnapshot.docs) {
        const friendData = docSnapshot.data();
        const friendDoc = await getDoc(doc(db, 'users', friendData.friendId));
        if (friendDoc.exists()) {
          friendsList.push({
            id: friendData.friendId,
            username: friendDoc.data().username,
          });
        }
      }

      setFriends(friendsList);
    };

    fetchFriends();
  }, [currentUser, refresh]); // Add refresh to the dependency array to refetch friends when it changes

  const handleRemoveButtonPress = (friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
  };

  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;

    try {
      // Remove friend relationship in both directions
      await deleteDoc(doc(db, 'friends', `${currentUser.uid}_${selectedFriend.id}`));
      await deleteDoc(doc(db, 'friends', `${selectedFriend.id}_${currentUser.uid}`));

      setFriends(friends.filter(friend => friend.id !== selectedFriend.id));
      setModalVisible(false);
      setSelectedFriend(null);
      alert('Friend removed successfully');
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
    backgroundColor: '#f5E7B2',
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
