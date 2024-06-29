// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Correct import
import SwitchSelector from 'react-native-switch-selector';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);

export default function HomeScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [chatMode, setChatMode] = useState('friends'); // 'friends' or 'friendsOfFriends'
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

    if (route.params?.autoQueue === true) {
      handleJoinQueue();
    }
  }, [route.params?.autoQueue]);

  const handleJoinQueue = async () => {
    const user = auth.currentUser;
    if (!user || inQueue) return;
  
    setInQueue(true);
    console.log(`${username} joined queue with mode: ${chatMode}`);
  
    try {
      const queueRef = collection(db, 'queue');
      const existingQueueQuery = query(queueRef, where('userId', '==', user.uid));
      const existingQueueSnapshot = await getDocs(existingQueueQuery);
  
      if (existingQueueSnapshot.empty) {
        await addDoc(queueRef, {
          userId: user.uid,
          username: username,
          chatMode: chatMode,
          timestamp: new Date(),
        });
  
        // Start listening for a pair after adding to the queue
        const unsubscribe = onSnapshot(queueRef, async (snapshot) => {
          let potentialMatches;
          if (chatMode === 'friends') {
            // Fetch friends list from the database
            const friendsQuery = query(collection(db, 'friends'), where('status', '==', 'accepted'), where('user1', '==', user.uid));
            const friendsQuery2 = query(collection(db, 'friends'), where('status', '==', 'accepted'), where('user2', '==', user.uid));
            const friendsSnapshot = await getDocs(friendsQuery);
            const friendsSnapshot2 = await getDocs(friendsQuery2);
            const friendIds = [
              ...friendsSnapshot.docs.map(doc => doc.data().user2),
              ...friendsSnapshot2.docs.map(doc => doc.data().user1),
            ];
  
            potentialMatches = snapshot.docs.filter(doc =>
              doc.data().userId !== user.uid &&
              friendIds.includes(doc.data().userId) &&
              doc.data().chatMode === chatMode
            );
          } else {
            // For 'Everyone' mode, consider all users except self
            potentialMatches = snapshot.docs.filter(doc =>
              doc.data().userId !== user.uid &&
              doc.data().chatMode === chatMode
            );
          }
  
          if (potentialMatches.length > 0) {
            const match = potentialMatches[0]; // Take the first eligible match
  
            // Create a chat document
            const chatId = [match.data().userId, user.uid].sort().join('_');
            const chatDocRef = doc(db, 'chats', chatId);
            await setDoc(chatDocRef, {
              users: [match.data().userId, user.uid],
              usernames: {
                [match.data().userId]: match.data().username,
                [user.uid]: username,
              },
              timestamp: new Date(),
              active: true,
            });
  
            // Remove users from the queue
            await deleteDoc(doc(db, 'queue', match.id));
            await deleteDoc(doc(db, 'queue', user.uid));
  
            // Navigate both users to the chat
            const friendName = match.data().username;
            navigation.navigate('Chat', { friendId: match.data().userId, friendName, chatId });
  
            clearTimeout(queueTimeoutRef.current);
            setInQueue(false);
            unsubscribe();
            console.log(`${username} matched with ${friendName}`);
          }
        });
  
        // Set a timeout to stop listening for a pair after a certain time
        queueTimeoutRef.current = setTimeout(async () => {
          console.log('Timeout reached, no match found');
          unsubscribe(); // Stop listening for changes
          await leaveQueue(user.uid); // Remove user from the queue
          setInQueue(false);
          alert('No pair found. Please try again later.');
        }, 5000); // Adjust timeout as needed
      }
    } catch (error) {
      console.error('Error joining queue: ', error);
      setInQueue(false);
    }
  };
  
  const leaveQueue = async (userId) => {
    clearTimeout(queueTimeoutRef.current);
    const queueRef = collection(db, 'queue');
    const q = query(queueRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref); // Ensure users are removed
    });
    setInQueue(false); // Ensure the UI is updated to reflect the user is not in queue
  };
  

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.switchContainer}>
      <SwitchSelector
        initial={0}
        onPress={async (value) => {
          if (inQueue) {
            await leaveQueue(auth.currentUser.uid);
          }
          setChatMode(value);
        }}
        textColor='#ff4444' // text color
        selectedColor='#fff' // text color when selected
        buttonColor='#ff4444' // button background color
        borderColor='#ff4444' // border color
        hasPadding
        options={[
          { label: "Friends only", value: "friends" },
          { label: "Everyone", value: "everyone" }
        ]}
        testID='chat-mode-selector'
        accessibilityLabel='chat-mode-selector'
      />
      </View>
      <Pressable
        style={styles.container}
        onPress={() => {
          if (!inQueue) handleJoinQueue();
        }}
      >
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
  switchContainer: {
    paddingTop: 10,
    paddingHorizontal: 30,
    backgroundColor: '#232323', // Ensure this matches the safe area bg if needed
  },
  container: {
    flex: 1,
    padding: 16,
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
  switchSelector: {
    marginTop: 20,
    marginBottom: 20,
  },
});