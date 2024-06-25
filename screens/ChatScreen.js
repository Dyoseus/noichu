// ChatScreen.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, SafeAreaView, Image } from 'react-native';
import { getFirestore, doc, collection, addDoc, onSnapshot, orderBy, query, updateDoc, getDoc, where, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);

export default function ChatScreen({ route, navigation }) {
  const { friendId, chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendName, setFriendName] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const flatListRef = useRef(null);
  const queueTimeoutRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchFriendName = async () => {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        setFriendName(friendDoc.data().username);
      }
    };

    fetchFriendName();
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(updatedMessages);
      if (flatListRef.current) {
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
      }
    });

    return () => unsubscribe();
  }, [chatId, friendId]);

  useLayoutEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', _keyboardDidShow);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', _keyboardDidHide);

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const _keyboardDidShow = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const _keyboardDidHide = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleLeaveChat = () => {
    navigation.goBack();
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      sender: user.uid,
      timestamp: new Date(),
    });
    setNewMessage('');
  };

  const handleFindNewChat = () => {
    navigation.navigate('Home', { autoQueue: true });
  };

  // This useEffect will mark the user as not joined when they leave the ChatScreen
  useEffect(() => {
    const chatDocRef = doc(db, 'chats', chatId);

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // Mark the user as not joined when leaving the chat screen
      updateDoc(chatDocRef, {
        [`${user.uid === route.params.friendId ? 'user1Joined' : 'user2Joined'}`]: false,
      });
    });

    return unsubscribe;
  }, [chatId, navigation, route.params.friendId, user.uid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 20}>
        <View style={styles.header}>
          <Pressable onPress={handleLeaveChat} style={styles.leaveButton}>
            <Image source={require('../assets/arrow.png')} style={styles.leaveImage} />
          </Pressable>
          <Text style={styles.title}>Chat with {friendName}</Text>
          <Pressable onPress={handleFindNewChat} style={styles.newChatButton}>
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </Pressable>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <View style={[styles.messageContainer, item.sender === user.uid ? styles.userMessage : styles.otherMessage]}>
              <Text style={[styles.messageText, item.sender === user.uid ? styles.userMessageText : null]}>{item.text}</Text>
              <Text style={styles.timestamp}>{new Date(item.timestamp.seconds * 1000).toLocaleTimeString()}</Text>
            </View>
          )}
          keyExtractor={item => item.id}
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message"
            placeholderTextColor="#aaa"
          />
          <Pressable style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... other styles ...
  newChatButton: {
    position: 'absolute',
    right: 0,
    top: -5,
    padding: 10,
    backgroundColor: 'white', // Just as an example
  },
  newChatButtonText: {
    color: '#000', // Adjust color to make it visible
    fontWeight: 'bold',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Adjust top padding for Android notch
    backgroundColor: '#232323',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  leaveButton: {
    position: 'absolute',
    left: 10,
    top: 1, // Adjust for better accessibility
  },
  leaveImage: {
    width: 25,
    height: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    padding: 4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  sendButton: {
    backgroundColor: '#2f4f4f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  messageText: {
    fontSize: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ff4444',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#c7c7c7',
    alignSelf: 'flex-end',
  }
});