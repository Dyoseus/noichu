import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function FriendsListScreen({ refresh, onFriendRemoved }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchFriends = async () => {
      const friendsQuery1 = firestore().collection('friends')
        .where('user1', '==', currentUser.uid)
        .where('status', '==', 'accepted');
      const friendsQuery2 = firestore().collection('friends')
        .where('user2', '==', currentUser.uid)
        .where('status', '==', 'accepted');
      
      const [snapshot1, snapshot2] = await Promise.all([friendsQuery1.get(), friendsQuery2.get()]);
      const friendsList = [];

      snapshot1.forEach(docSnapshot => friendsList.push(docSnapshot.data().user2));
      snapshot2.forEach(docSnapshot => friendsList.push(docSnapshot.data().user1));

      const friendDetailsPromises = friendsList.map(friendId => 
        firestore().collection('users').doc(friendId).get()
      );
      const friendDetailsSnapshots = await Promise.all(friendDetailsPromises);

      const updatedFriends = friendDetailsSnapshots.map(doc => ({
        id: doc.id,
        phoneNumber: doc.data().phoneNumber,
      }));

      setFriends(updatedFriends);
    };

    fetchFriends();
  }, [currentUser, refresh]);

  const handleRemoveButtonPress = (friend) => {
    setSelectedFriend(friend);
    setModalVisible(true);
  };

  const handleRemoveFriend = async () => {
    if (!selectedFriend) return;

    try {
      await firestore().collection('friends').doc(`${currentUser.uid}_${selectedFriend.id}`).delete();
      setFriends(friends.filter(friend => friend.id !== selectedFriend.id));
      setModalVisible(false);
      setSelectedFriend(null);
      alert('Friend removed successfully');
      if (typeof onFriendRemoved === 'function') {
        onFriendRemoved(); // Calls the callback to indicate a friend was removed
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
            <Text style={styles.friendText}>{item.firstName}</Text>
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
          transparent
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Remove friend {selectedFriend.firstName}?</Text>
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
