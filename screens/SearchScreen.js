import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity, Modal, Button, Alert } from 'react-native';
import { getFirestore, collection, query, where, getDocs, orderBy, startAt, endAt, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser; 
      if (!user) {
        console.log("No current user found");
        return;
      }
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setCurrentUser({ id: userDoc.id, ...userDoc.data() });
      } else {
        console.log("User document not found");
      }
    };

    fetchCurrentUser();
  }, []);
  

  useEffect(() => {
    if (currentUser) {
      fetchMutualFriends(currentUser.id).then(setSuggestions);
    }
  }, [currentUser]);

  useEffect(() => {
    if (search.trim() === '') {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          orderBy('username'),
          startAt(search),
          endAt(search + '\uf8ff'),
          limit(5) 
        );

        const querySnapshot = await getDocs(q);

        const users = [];
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() });
        });

        setResults(users);
      } catch (error) {
        console.error("Error fetching search results: ", error);
      }
    };

    fetchResults();
  }, [search]);

  const handleUserPress = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !selectedUser) return;

    try {
      // Check for existing friend request
      const existingRequestQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', currentUser.id),
        where('to', '==', selectedUser.id),
        where('status', '==', 'pending')
      );
      const existingRequestSnapshot = await getDocs(existingRequestQuery);

      if (!existingRequestSnapshot.empty) {
        Alert.alert('Friend Request Sent', 'You already have a pending friend request to this user.'); 
        closeModal();
        return;
      }

      // Check if already friends
      const areAlreadyFriends = await checkIfFriends(currentUser.id, selectedUser.id);
      if (areAlreadyFriends) {
        Alert.alert('Already Friends', 'You are already friends with this user.');
        closeModal();
        return;
      }

      await setDoc(doc(db, 'friendRequests', `${currentUser.id}_${selectedUser.id}`), {
        from: currentUser.id,
        to: selectedUser.id,
        status: 'pending',
        timestamp: new Date(),
      });
      Alert.alert('Success', 'Friend request sent successfully!'); 
      closeModal(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
      console.error('Failed to send friend request: ' + error.message);
    }
  };

  const checkIfFriends = async (user1Id, user2Id) => {
    const friendsDocRef = doc(db, 'friends', user1Id);
    const docSnapshot = await getDoc(friendsDocRef);
    if (docSnapshot.exists()) {
      return docSnapshot.data().userFriends && docSnapshot.data().userFriends[user2Id];
    }
    return false; 
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
  };

  // Function to fetch mutual friends (directly within SearchScreen)
  const fetchMutualFriends = async (currentUserUid) => {
    if (!currentUserUid) {
      console.error("Error: currentUserUid is undefined.");
      return [];
    }
  
    const friendsRef = collection(db, 'friends');
    let currentUserFriends = new Set();
  
    try {
      // Fetch current users friends
      let q = query(friendsRef, where('user1', '==', currentUserUid), where('status', '==', 'accepted'));
      let friendsSnapshot = await getDocs(q);
      friendsSnapshot.forEach(doc => currentUserFriends.add(doc.data().user2));
  
      q = query(friendsRef, where('user2', '==', currentUserUid), where('status', '==', 'accepted'));
      friendsSnapshot = await getDocs(q);
      friendsSnapshot.forEach(doc => currentUserFriends.add(doc.data().user1));
  
      // Fetch potential mutual friends
      let potentialMutualFriends = new Set();
      for (let friendId of currentUserFriends) {
        q = query(friendsRef, where('user1', '==', friendId), where('status', '==', 'accepted'));
        let theirFriendsSnapshot = await getDocs(q);
        theirFriendsSnapshot.forEach(doc => {
          if (doc.data().user2 !== currentUserUid && !currentUserFriends.has(doc.data().user2)) {
            potentialMutualFriends.add(doc.data().user2);
          }
        });
  
        q = query(friendsRef, where('user2', '==', friendId), where('status', '==', 'accepted'));
        theirFriendsSnapshot = await getDocs(q);
        theirFriendsSnapshot.forEach(doc => {
          if (doc.data().user1 !== currentUserUid && !currentUserFriends.has(doc.data().user1)) {
            potentialMutualFriends.add(doc.data().user1);
          }
        });
      }
  
      // Fetch details of mutual friends
      let mutualFriends = [];
      for (let userId of potentialMutualFriends) {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          mutualFriends.push({ id: userId, ...userDoc.data() });
        }
      }
  
      return mutualFriends;
    } catch (error) {
      console.error("Error fetching mutual friends: ", error);
      return [];
    }
  };
  

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Find friends by username"
        placeholderTextColor="#ffffff"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false} 
        autoCapitalize="none" 
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleUserPress(item)}>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.suggestionTitle}>Suggestions</Text>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleUserPress(item)}>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {selectedUser && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Username: {selectedUser.username}</Text>
              <Button title="Send Friend Request" onPress={handleSendFriendRequest} />
              <Button title="Close" onPress={closeModal} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#232323',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    color: 'white',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    fontFamily: 'sans-serif',
  },
  resultContainer: {
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  resultText: {
    fontSize: 16,
    fontFamily: 'sans-serif',
  },
  suggestionTitle: {
    fontSize: 18,
    color: 'white',
    marginVertical: 10,
    fontFamily: 'sans-serif',
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