import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, PanResponder, Animated, Alert } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig'; // Ensure you import the initialized Firebase app

const auth = getAuth(app);
const db = getFirestore(app);

export default function HomeScreen({ navigation }) {
  const [dailyChatFriend, setDailyChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
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
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: async (e, gestureState) => {
        if (gestureState.dy < -50) { // Detect swipe up
          await handleJoinQueue();
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const handleJoinQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;

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
      }

      checkForPair(user.uid);
      queueTimeoutRef.current = setTimeout(() => {
        alert('No pair found. Please try again later.');
        leaveQueue(user.uid);
      }, 20000); // 20 seconds timeout
    } catch (error) {
      console.error('Error joining queue: ', error);
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

        const chatId = `${userId}_${pairData.userId}`;
        const chatDocRef = doc(db, 'chats', chatId);

        await setDoc(chatDocRef, {
          users: [userId, pairData.userId],
          timestamp: new Date(),
        });

        // Remove both users from the queue
        await deleteDoc(doc(queueRef, pairDoc.id));
        await leaveQueue(userId);

        // Navigate both users to the chat screen
        navigation.navigate('Chat', { friendId: pairData.userId, friendName: pairData.username });
        clearTimeout(queueTimeoutRef.current);
      }
    } catch (error) {
      console.error('Error checking for pair: ', error);
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
    <Animated.View 
      style={[styles.container, pan.getLayout()]} 
      {...panResponder.panHandlers}
    >
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
      <Text style={styles.title}>Welcome {username}! Swipe up to find a chat</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <Text style={styles.sender}>{item.sender}:</Text>
            <Text style={styles.message}>{item.text}</Text>
          </View>
        )}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5E7B2',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  sender: {
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
  },
});
