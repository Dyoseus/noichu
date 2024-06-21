import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity, Modal, Button } from 'react-native';
import { getFirestore, collection, query, where, getDocs, orderBy, startAt, endAt, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig'; // Ensure you are importing the initialized Firebase app

const db = getFirestore(app);
const auth = getAuth(app);

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setCurrentUser({ id: user.uid, ...userDoc.data() });
      }
    };

    fetchCurrentUser();
  }, []);

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
          limit(5) // Limit the results to 5
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
      await setDoc(doc(db, 'friendRequests', `${selectedUser.id}_${currentUser.id}`), {
        from: currentUser.id,
        to: selectedUser.id,
        status: 'pending',
        timestamp: new Date(),
      });
      alert('Friend request sent!');
      closeModal();
    } catch (error) {
      alert('Failed to send friend request: ' + error.message);
    }
  };
  

  const closeModal = () => {
    setModalVisible(false);
    setSelectedUser(null);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Find friends by username"
        placeholderTextColor="#ffffff"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false} // Disable auto-correct to avoid interference
        autoCapitalize="none" // Disable auto-capitalize to avoid case issues
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
