import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);

export default function HomeScreen({ navigation }) {
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
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: async (e, gestureState) => {
        if (gestureState.dy < -50 && !inQueue) { // Detect swipe up and check if not in queue
          await handleJoinQueue();
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

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
      }

      checkForPair(user.uid);
      queueTimeoutRef.current = setTimeout(() => {
        alert('No pair found. Please try again later.');
        leaveQueue(user.uid);
        setInQueue(false); // Reset inQueue state
      }, 5000); // 5 seconds timeout
    } catch (error) {
      console.error('Error joining queue: ', error);
      setInQueue(false); // Reset inQueue state in case of error
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

        await setDoc(chatDocRef, {
          users: [userId, pairData.userId],
          usernames: {
            [userId]: username,
            [pairData.userId]: pairData.username,
          },
          timestamp: new Date(),
          user1Joined: false,
          user2Joined: false,
          active: true,
        });

        // Remove both users from the queue
        await deleteDoc(doc(queueRef, pairDoc.id));
        await leaveQueue(userId);

        // Notify both users of the chat
        await notifyUser(pairData.userId, chatId, userId, username);
        await notifyUser(userId, chatId, pairData.userId, pairData.username);

        clearTimeout(queueTimeoutRef.current);
        setInQueue(false); // Reset inQueue state
      } else {
        console.log('No pair found in queue');
      }
    } catch (error) {
      console.error('Error checking for pair: ', error);
      setInQueue(false); // Reset inQueue state in case of error
    }
  };

  const notifyUser = async (userId, chatId, friendId, friendName) => {
    try {
      const chatDocRef = doc(db, 'chats', chatId);

      // Listen for changes to the chat document
      const unsubscribe = onSnapshot(chatDocRef, (chatDoc) => {
        if (chatDoc.exists() && chatDoc.data().user1Joined && chatDoc.data().user2Joined) {
          // Navigate the current user to the chat screen
          if (auth.currentUser.uid === userId) {
            navigation.navigate('Chat', { friendId: friendId, friendName: friendName, chatId: chatId });
          }
        }
      });

      // Mark the user as joined
      await updateDoc(chatDocRef, {
        [`${userId === auth.currentUser.uid ? 'user1Joined' : 'user2Joined'}`]: true,
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
      <Animated.View 
        style={[styles.container, pan.getLayout()]} 
        {...panResponder.panHandlers}
      >
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Welcome {username}! Swipe up to find a chat</Text>
        </View>
      </Animated.View>
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
