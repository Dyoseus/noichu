// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);

export default function HomeScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const queueTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        }
      }
    };

    fetchUserData();

    if (route.params?.autoQueue) {
      handleJoinQueue();
    }
  }, [route.params?.autoQueue]);

  const handleJoinQueue = async () => {
    const user = auth.currentUser;
    if (!user || inQueue) return;

    setInQueue(true);

    try {
      const queueRef = collection(db, 'queue');
      const existingQueueQuery = query(queueRef, where('userId', '==', user.uid));
      const existingQueueSnapshot = await getDocs(existingQueueQuery);

      if (existingQueueSnapshot.empty) {
        await addDoc(queueRef, {
          userId: user.uid,
          username: username,
          timestamp: new Date(),
        });

        // Start listening for a pair after adding to the queue
        const unsubscribe = onSnapshot(queueRef, async (snapshot) => {
          if (snapshot.size >= 2) {
            // Get the first two users in the queue
            const user1Doc = snapshot.docs[0];
            const user2Doc = snapshot.docs[1];

            // Create a chat document
            const chatId = [user1Doc.data().userId, user2Doc.data().userId].sort().join('_');
            const chatDocRef = doc(db, 'chats', chatId);
            await setDoc(chatDocRef, {
              users: [user1Doc.data().userId, user2Doc.data().userId],
              usernames: {
                [user1Doc.data().userId]: user1Doc.data().username,
                [user2Doc.data().userId]: user2Doc.data().username,
              },
              timestamp: new Date(),
              active: true,
              user1Joined: false, // Set to false initially
              user2Joined: false, // Set to false initially
            });

            // Remove users from the queue
            await Promise.all([
              deleteDoc(user1Doc.ref),
              deleteDoc(user2Doc.ref),
            ]);

            // Navigate both users to the chat
            const friendId = user1Doc.data().userId === user.uid ? user2Doc.data().userId : user1Doc.data().userId;
            const friendName = user1Doc.data().userId === user.uid ? user2Doc.data().username : user1Doc.data().username;
            navigation.navigate('Chat', { friendId, friendName, chatId });

            // Stop listening for changes in the queue
            unsubscribe();
          }
        });

        // Set a timeout to stop listening for a pair after a certain time
        queueTimeoutRef.current = setTimeout(async () => {
          unsubscribe(); // Stop listening for changes
          setInQueue(false);
          alert('No pair found. Please try again later.');
        }, 5000);
      }
    } catch (error) {
      console.error('Error joining queue: ', error);
      setInQueue(false);
    }
  };

  const leaveQueue = async (userId) => {
    clearTimeout(queueTimeoutRef.current);
    setInQueue(false);
    const queueRef = collection(db, 'queue');
    const q = query(queueRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  };

  const handleLogout = async () => {
    try {
      await leaveQueue(auth.currentUser.uid);
      await signOut(auth);
      navigation.navigate('Auth');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        style={styles.container}
        onPress={() => {
          if (!inQueue) handleJoinQueue();
        }}
      >
        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
          onPressIn={(event) => {
            // Prevent this press from propagating to the parent Pressable
            event.stopPropagation();
          }}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{inQueue ? 'Finding a chat...' : `Welcome ${username}! Tap to find a chat`}</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#232323',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  logoutButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    zIndex: 1,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
  },
});