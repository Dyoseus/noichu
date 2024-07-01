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
import * as ImagePicker from 'expo-image-picker';
import { 
  getFirestore, 
  doc, 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  updateDoc, 
  getDoc, 
  where, 
  getDocs, 
  deleteDoc, 
  setDoc,
  startAfter,
  limit,
  getDocsFromCache, 
  DocumentSnapshot
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);
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
  const user = auth.currentUser;
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false); // Track uploading state
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

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
    if (newMessage.trim() === '' && !image) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messageData = {
      sender: user.uid,
      timestamp: new Date(),
    };

    if (newMessage.trim() !== '') {
      messageData.text = newMessage;
    }

    if (image) {
      setUploading(true);
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `images/${Date.now()}_${user.uid}.jpg`);
        const response = await fetch(image.uri);
        const blob = await response.blob();

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        messageData.imageUrl = downloadURL;
        setImage(null);
      } catch (error) {
        console.error("Error uploading image: ", error);
      } finally {
        setUploading(false);
      }
    }

    await addDoc(messagesRef, messageData);
    setNewMessage('');
  };

  const handleFindNewChat = () => {
    navigation.navigate('Home', { autoQueue: true });
  };

  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.2,
      });

      if (!result.canceled) {
        const source = { uri: result.assets[0].uri };
        setImage(source);
      }
    } catch (error) {
      console.error("Error selecting image: ", error);
    }
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

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfilePic(userDoc.data().profilePic);
        }
      }
    };

    fetchUserData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 20}>
        <View style={styles.header}>
          <Pressable onPress={handleLeaveChat} style={styles.leaveButton}>
            <Image source={require('../assets/arrow.png')} style={styles.leaveImage} />
          </Pressable>
          {profilePic && <Image source={{ uri: profilePic }} style={styles.profilePic} />}
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
              {item.text ? (
                <Text style={[styles.messageText, item.sender === user.uid ? styles.userMessageText : null]}>{item.text}</Text>
              ) : (
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              )}
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
        {image && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            <Pressable onPress={() => setImage(null)} style={styles.removeImageButton}>
              <Text style={styles.removeImageButtonText}>Remove</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.inputContainer}>
          <Pressable style={styles.imageButton} onPress={handleSelectImage}>
            <Text style={styles.imageButtonText}>🖼️</Text>
          </Pressable>
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
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 20,
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
  imageButton: {
    backgroundColor: '#2f4f4f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 30,
    marginRight: 5,
    marginLeft: 5,
  },
  imageButtonText: {
    color: '#fff',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  removeImageButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
  },
  removeImageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});