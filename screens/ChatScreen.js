import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Keyboard, 
  SafeAreaView, 
  Image,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const MESSAGES_PER_PAGE = 20; 

export default function ChatScreen({ route, navigation }) {
  const { friendId, chatId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendName, setFriendName] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(false); // Track loading state
  const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
  const flatListRef = useRef(null);
  const queueTimeoutRef = useRef(null);
  const user = auth().currentUser;
  const [friendProfilePic, setFriendProfilePic] = useState(null);

  useEffect(() => {
    const fetchFriendData = async () => {
      const friendDoc = await firestore().collection('users').doc(friendId).get();
      if (friendDoc.exists) {
        setFriendName(friendDoc.data().username);
        setFriendProfilePic(friendDoc.data().profilePic);
      }
    };

    fetchFriendData();
    const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');
    const q = messagesRef.orderBy('timestamp', 'desc');

    const unsubscribe = q.onSnapshot((snapshot) => {
      const updatedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(updatedMessages);
    });

    return () => unsubscribe();
  }, [chatId, friendId]);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

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

    const messagesRef = firestore().collection('chats').doc(chatId).collection('messages');
    const messageData = {
      sender: user.uid,
      timestamp: new Date(),
      text: newMessage.trim(),
    };

    await messagesRef.add(messageData);
    setNewMessage('');
  };

  const handleFindNewChat = () => {
    navigation.navigate('Home', { autoQueue: true });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 20}>
        <View style={styles.header}>
          <Pressable onPress={handleLeaveChat} style={styles.leaveButton}>
            <Image source={require('../assets/arrow.png')} style={styles.leaveImage} />
          </Pressable>
          {friendProfilePic && <Image source={{ uri: friendProfilePic }} style={styles.profilePic} />}
          <Text style={styles.title}>{friendName}</Text>
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
          onContentSizeChange={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
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
  newChatButton: {
    position: 'absolute',
    right: 0,
    top: -5,
    padding: 10,
    backgroundColor: 'white', 
    borderRadius: 25,
  },
  newChatButtonText: {
    color: '#000', // Adjusted color to make it visible
    fontWeight: 'bold',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Adjusted top padding for Android notch
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
    top: 1, // Adjusted for better accessibility
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
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 25,
    marginRight: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    padding: 4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderRadius: 25,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginRight: 5,
    paddingHorizontal: 10,
    borderRadius: 25,
  },
  sendButton: {
    backgroundColor: '#2f4f4f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 5,
    borderRadius: 25,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
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
  },
});