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
  const pan = useRef(new Animated.ValueXY()).current;
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

    // This part checks for the autoQueue parameter to trigger joining the queue
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
      checkForPair(user.uid); // Move checkForPair here to ensure user is added first
    }

    queueTimeoutRef.current = setTimeout(async () => {
      console.log('Timeout reached, checking for pairs again.');
      const refreshed = await checkForPair(user.uid);
      if (!refreshed) {
        alert('No pair found. Please try again later.');
        await leaveQueue(user.uid);
        setInQueue(false);
      }
    }, 5000); // Check again after timeout to handle race conditions
  } catch (error) {
    console.error('Error joining queue: ', error);
    setInQueue(false);
  }
};

  
  const checkForPair = async (userId) => {
    try {
      const queueRef = collection(db, 'queue');
      const queueQuery = query(queueRef, where('userId', '!=', userId));
      const queueSnapshot = await getDocs(queueQuery);
  
      if (!queueSnapshot.empty) {
        const pairDoc = queueSnapshot.docs[0];
        const pairData = pairDoc.data();
  
        const chatId = [userId, pairData.userId].sort().join('_');
        const chatDocRef = doc(db, 'chats', chatId);
  
        const chatDoc = await getDoc(chatDocRef);
        if (!chatDoc.exists()) {
          await setDoc(chatDocRef, {
            users: [userId, pairData.userId],
            usernames: {
              [userId]: username,
              [pairData.userId]: pairData.username,
            },
            timestamp: new Date(),
            active: true,
            user1Joined: true,
            user2Joined: false, // initially set to false
          });
        }
  
        // Update the document to show both users have joined
        await updateDoc(chatDocRef, {
          user1Joined: true,
          user2Joined: true,
        });
  
        // Ensure both users are navigated to the Chat screen
        if (auth.currentUser.uid === userId) {
          navigation.navigate('Chat', { friendId: pairData.userId, friendName: pairData.username, chatId: chatId });
        } else {
          // Navigate the other user to the chat screen
          await notifyUser(pairData.userId, chatId, userId, username);
        }
  
        await deleteDoc(doc(queueRef, pairDoc.id));
        await leaveQueue(userId);
        await leaveQueue(pairData.userId);
  
        clearTimeout(queueTimeoutRef.current);
        setInQueue(false); 
      } else {
        console.log('No pair found in queue');
      }
    } catch (error) {
      console.error('Error checking for pair: ', error);
      setInQueue(false);
    }
  };
  


  const notifyUser = async (userId, chatId, friendId, friendName) => {
    try {
      const chatDocRef = doc(db, 'chats', chatId);
  
      // 1. Update the document to show the user has joined
      await updateDoc(chatDocRef, {
        [`${userId === auth.currentUser.uid ? 'user1Joined' : 'user2Joined'}`]: true,
      });
  
      // 2. Listen for changes to the chat document
      const unsubscribe = onSnapshot(chatDocRef, (chatDoc) => {
        if (chatDoc.exists() && chatDoc.data().user1Joined && chatDoc.data().user2Joined) {
          // Navigate the current user to the chat screen
          if (auth.currentUser.uid === userId) {
            navigation.navigate('Chat', { friendId: friendId, friendName: friendName, chatId: chatId });
          }
        }
      });
  
      return () => unsubscribe(); 
    } catch (error) {
      console.error('Error notifying user: ', error);
    }
  };

  const leaveQueue = async (userId) => {
    const queueRef = collection(db, 'queue');
    const existingQueueQuery = query(queueRef, where('userId', '==', userId));
    const existingQueueSnapshot = await getDocs(existingQueueQuery);

    existingQueueSnapshot.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, 'queue', docSnapshot.id));
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Auth'); // Navigate to Auth stack after logging out
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