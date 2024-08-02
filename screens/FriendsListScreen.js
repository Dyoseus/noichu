import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useFocusEffect } from '@react-navigation/native';

export default function FriendsListScreen({ refresh, onFriendRemoved }) {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUser = auth().currentUser;

  const fetchFriends = async () => {
    if (!currentUser) return;

    const friendsQuery = firestore().collection('friends')
      .where('users', 'array-contains', currentUser.uid);
      
    const snapshot = await friendsQuery.get();

    const friendPromises = snapshot.docs.map(async (doc) => {
      const friendId = doc.data().users.find(id => id !== currentUser.uid);
      const friendDoc = await firestore().collection('users').doc(friendId).get();
      if (friendDoc.exists) {
        return {
          id: friendId,
          firstName: friendDoc.data().firstName,
        };
      }
      return null;
    });

    const friendsList = await Promise.all(friendPromises);
    setFriends(friendsList.filter(friend => friend !== null));
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFriends();
    }, [currentUser, refresh])
  );
  
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