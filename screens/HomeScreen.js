import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SwitchSelector from 'react-native-switch-selector';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function HomeScreen({ navigation, route }) {
  const [username, setUsername] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [chatMode, setChatMode] = useState('friends');
  const queueTimeoutRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth().currentUser;
      if (user) {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          setUsername(userDoc.data().firstName);
        }
      }
    };

    fetchUserData();

    if (route.params?.autoQueue === true) {
      handleJoinQueue();
    }
  }, [route.params?.autoQueue]);

  const handleJoinQueue = async () => {
    const user = auth().currentUser;
    if (!user || inQueue) return;
  
    setInQueue(true);
    try {
      const queueRef = firestore().collection('queue');
      const existingQueueQuery = queueRef.where('userId', '==', user.uid);
      const existingQueueSnapshot = await existingQueueQuery.get();
  
      if (existingQueueSnapshot.empty) {
        await queueRef.add({
          userId: user.uid,
          username: username,
          chatMode: chatMode,
          timestamp: new Date(),
        });
  
        const unsubscribe = queueRef.onSnapshot(async (snapshot) => {
          let potentialMatches;
          if (chatMode === 'friends') {
            const friendsQuery1 = firestore().collection('friends')
              .where('user1', '==', user.uid)
              .where('status', '==', 'accepted');
            const friendsQuery2 = firestore().collection('friends')
              .where('user2', '==', user.uid)
              .where('status', '==', 'accepted');
            const [friendsSnapshot1, friendsSnapshot2] = await Promise.all([friendsQuery1.get(), friendsQuery2.get()]);
            const friendIds = [
              ...friendsSnapshot1.docs.map(doc => doc.data().user2),
              ...friendsSnapshot2.docs.map(doc => doc.data().user1),
            ];
  
            potentialMatches = snapshot.docs.filter(doc =>
              doc.data().userId !== user.uid &&
              friendIds.includes(doc.data().userId) &&
              doc.data().chatMode === chatMode
            );
          } else {
            potentialMatches = snapshot.docs.filter(doc =>
              doc.data().userId !== user.uid &&
              doc.data().chatMode === chatMode
            );
          }
  
          if (potentialMatches.length > 0) {
            const match = potentialMatches[0];
  
            const chatId = [match.data().userId, user.uid].sort().join('_');
            const chatDocRef = firestore().collection('chats').doc(chatId);
            await chatDocRef.set({
              users: [match.data().userId, user.uid],
              usernames: {
                [match.data().userId]: match.data().username,
                [user.uid]: username,
              },
              timestamp: new Date(),
              active: true,
            });
  
            await firestore().collection('queue').doc(match.id).delete();
            await firestore().collection('queue').doc(user.uid).delete();
  
            navigation.navigate('Chat', { friendId: match.data().userId, friendName: match.data().username, chatId });
  
            clearTimeout(queueTimeoutRef.current);
            setInQueue(false);
            unsubscribe();
          }
        });
  
        queueTimeoutRef.current = setTimeout(async () => {
          unsubscribe();
          await leaveQueue(user.uid);
          setInQueue(false);
          alert('No pair found. Please try again later.');
        }, 5000);
      }
    } catch (error) {
      setInQueue(false);
    }
  };
  
  const leaveQueue = async (userId) => {
    clearTimeout(queueTimeoutRef.current);
    const queueRef = firestore().collection('queue');
    const q = queueRef.where('userId', '==', userId);
    const snapshot = await q.get();
    snapshot.forEach(async (doc) => {
      await doc.ref.delete();
    });
    setInQueue(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.switchContainer}>
      <SwitchSelector
        initial={0}
        onPress={async (value) => {
          if (inQueue) {
            await leaveQueue(auth().currentUser.uid);
          }
          setChatMode(value);
        }}
        textColor='#ff4444'
        selectedColor='#fff'
        buttonColor='#ff4444'
        borderColor='#ff4444'
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
    backgroundColor: '#232323',
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
});
