// PostCallScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function PostCallScreen({ route }) {
  const { userId } = route.params;
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const navigation = useNavigation();
  const currentUser = auth().currentUser;

  useEffect(() => {
    const fetchOtherUserProfile = async () => {
      if (!userId) return;
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        setOtherUserProfile(userDoc.data());
      }
    };
    fetchOtherUserProfile();
  }, [userId]);

  const handleVote = async (vote) => {
    if (!currentUser || !userId) return;

    try {
      if (vote === 'upvote') {
        // Send friend request
        await firestore().collection('friendRequests').add({
          from: currentUser.uid,
          to: userId,
          status: 'pending',
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
        console.log('Friend request sent');
      } else {
        // Downvote doesn't send a friend request
        console.log('Downvoted');
      }

      // Navigate back to the video screen
      navigation.navigate('Video');
    } catch (error) {
      console.error('Error handling vote:', error);
    }
  };

  if (!otherUserProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{otherUserProfile.firstName}</Text>
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.upvoteButton]}
          onPress={() => handleVote('upvote')}
        >
          <Text style={styles.buttonText}>Upvote</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.downvoteButton]}
          onPress={() => handleVote('downvote')}
        >
          <Text style={styles.buttonText}>Downvote</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#232323',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    elevation: 3,
  },
  upvoteButton: {
    backgroundColor: '#4CAF50',
  },
  downvoteButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});