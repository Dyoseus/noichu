import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../firebaseConfig'; // Ensure you import the initialized Firebase app

const auth = getAuth(app);

const friends = ['Friend1', 'Friend2', 'Friend3', 'Friend4'];

export default function HomeScreen({ navigation }) {
  const [dailyChatFriend, setDailyChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Randomly select a friend for the daily chat
    const friend = friends[Math.floor(Math.random() * friends.length)];
    setDailyChatFriend(friend);

    // Mock messages for the daily chat
    const mockMessages = [
      { id: '1', text: `Hello from ${friend}`, sender: friend },
      { id: '2', text: 'How are you?', sender: 'You' },
      { id: '3', text: 'I am good, thanks!', sender: friend },
    ];
    setMessages(mockMessages);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Auth'); // Navigate to Auth stack after logging out
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
      <Text style={styles.title}>Welcome! Daily Chat with {dailyChatFriend}</Text>
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
    </View>
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
