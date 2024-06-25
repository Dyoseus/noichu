import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function MessageScreen() {
  const [friends, setFriends] = useState([]);
  const currentUser = auth.currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      // Fetch friends with chat history
      const q1 = query(collection(db, 'friends'), where('user1', '==', currentUser.uid), where('status', '==', 'accepted'));
      const q2 = query(collection(db, 'friends'), where('user2', '==', currentUser.uid), where('status', '==', 'accepted'));
      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const friendsList = [];

      snapshot1.forEach(async (docSnapshot) => {
        const friendData = docSnapshot.data();
        const friendDoc = await getDoc(doc(db, 'users', friendData.user2));

        if (friendDoc.exists()) {
          const chatId = [currentUser.uid, friendData.user2].sort().join('_'); 
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const latestMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
          const latestMessageSnapshot = await getDocs(latestMessageQuery);
          let latestMessage = '';
          if (!latestMessageSnapshot.empty) {
            latestMessage = latestMessageSnapshot.docs[0].data().text;
          }
          friendsList.push({
            id: friendData.user2,
            username: friendDoc.data().username,
            latestMessage,
            chatId,
          });
        }
      });

      snapshot2.forEach(async (docSnapshot) => {
        const friendData = docSnapshot.data();
        const friendDoc = await getDoc(doc(db, 'users', friendData.user1));

        if (friendDoc.exists()) {
          const chatId = [currentUser.uid, friendData.user1].sort().join('_'); 
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const latestMessageQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
          const latestMessageSnapshot = await getDocs(latestMessageQuery);
          let latestMessage = '';
          if (!latestMessageSnapshot.empty) {
            latestMessage = latestMessageSnapshot.docs[0].data().text;
          }
          friendsList.push({
            id: friendData.user1,
            username: friendDoc.data().username,
            latestMessage,
            chatId,
          });
        }
      });

      setFriends(friendsList);
    };

    fetchFriends();
  }, [currentUser]);

  const handlePress = (friend) => {
    navigation.navigate('Chat', { friendId: friend.id, friendName: friend.username, chatId: friend.chatId });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendContainer} onPress={() => handlePress(item)}>
            <Text style={styles.friendText}>{item.username}</Text>
            <Text style={styles.latestMessageText}>{item.latestMessage}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#232323',
  },
  friendContainer: {
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  friendText: {
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
  },
  latestMessageText: {
    fontSize: 14,
    fontFamily: 'sans-serif',
    color: '#666',
  },
});