import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function MessageScreen() {
  const [friends, setFriends] = useState([]);
  const currentUser = auth().currentUser;
  const navigation = useNavigation();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      const friendsQuery1 = firestore().collection('friends')
        .where('user1', '==', currentUser.uid)
        .where('status', '==', 'accepted');
      const friendsQuery2 = firestore().collection('friends')
        .where('user2', '==', currentUser.uid)
        .where('status', '==', 'accepted');
        
      const [snapshot1, snapshot2] = await Promise.all([friendsQuery1.get(), friendsQuery2.get()]);

      const friendPromises = [];
      snapshot1.forEach(docSnapshot => friendPromises.push(getFriendData(docSnapshot.data().user2)));
      snapshot2.forEach(docSnapshot => friendPromises.push(getFriendData(docSnapshot.data().user1)));

      const friendsList = await Promise.all(friendPromises);
      setFriends(friendsList);
    };

    const getFriendData = async (friendId) => {
      const friendDoc = await firestore().collection('users').doc(friendId).get();
      if (friendDoc.exists) {
        const chatId = [currentUser.uid, friendId].sort().join('_');
        const latestMessageDoc = await firestore().collection('chats').doc(chatId).collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();
        let latestMessage = '';
        if (!latestMessageDoc.empty) {
          latestMessage = latestMessageDoc.docs[0].data().text;
        }
        return {
          id: friendId,
          username: friendDoc.data().username,
          latestMessage,
          chatId,
        };
      }
      return null;
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
        keyExtractor={item => item.id}
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
