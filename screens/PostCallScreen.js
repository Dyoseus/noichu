// PostCallScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../firebaseConfig';

const db = getFirestore(app);

export default function PostCallScreen({ route }) {
  const { otherUserId } = route.params;
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [vote, setVote] = useState(null); // 'upvote' or 'downvote'
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchOtherUserProfile = async () => {
      if (!otherUserId) return;

      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        setOtherUserProfile(userDoc.data());
      }
    };

    fetchOtherUserProfile();
  }, [otherUserId]);

  useEffect(() => {
    if (vote) {
      handleVote(vote);
    }
  }, [vote]);

  const handleVote = async (vote) => {
    if (!currentUser || !otherUserId) return;

    const voteDocRef = doc(db, 'votes', `${currentUser.uid}_${otherUserId}`);
    await setDoc(voteDocRef, { vote, from: currentUser.uid, to: otherUserId });

    const otherUserVoteDocRef = doc(db, 'votes', `${otherUserId}_${currentUser.uid}`);
    const otherUserVoteDoc = await getDoc(otherUserVoteDocRef);

    if (vote === 'downvote') {
      // Block the user
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: arrayUnion(otherUserId),
      });
      await updateDoc(doc(db, 'users', otherUserId), {
        blockedUsers: arrayUnion(currentUser.uid),
      });
    } else if (vote === 'upvote' && otherUserVoteDoc.exists() && otherUserVoteDoc.data().vote === 'upvote') {
      // Add to friends list if both upvoted
      await addDoc(collection(db, 'friends'), {
        user1: currentUser.uid,
        user2: otherUserId,
        status: 'accepted',
      });
      await addDoc(collection(db, 'friends'), {
        user1: otherUserId,
        user2: currentUser.uid,
        status: 'accepted',
      });
    }

    navigation.navigate('MainScreen'); // Navigate back to the main screen after voting
  };

  if (!otherUserProfile) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{otherUserProfile.username}</Text>
      <Text style={styles.description}>{otherUserProfile.description}</Text>
      <View style={styles.buttonContainer}>
        <Button
          title="Upvote"
          onPress={() => setVote('upvote')}
          color="green"
        />
        <Button
          title="Downvote"
          onPress={() => setVote('downvote')}
          color="red"
        />
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
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
});
