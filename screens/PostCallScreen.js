// PostCallScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { getFirestore, doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import GestureRecognizer from 'react-native-swipe-gestures';

export default function PostCallScreen() {
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { otherUserId } = route.params;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const db = getFirestore();
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          setCurrentUserId(user.uid);
        }

        const profileDoc = doc(db, 'profiles', otherUserId);
        const profileSnapshot = await getDoc(profileDoc);
        if (profileSnapshot.exists()) {
          setOtherUserProfile(profileSnapshot.data());
        } else {
          setErrorMessage('User profile not found.');
        }
      } catch (error) {
        setErrorMessage(`Error fetching profile: ${error.message}`);
      }
    };

    fetchProfile();
  }, [otherUserId]);

  const handleSwipeLeft = async () => {
    try {
      const db = getFirestore();
      const matchRef = doc(db, 'matches', `${currentUserId}_${otherUserId}`);
      await updateDoc(matchRef, { match: false });
      navigation.navigate('HomeScreen');
    } catch (error) {
      setErrorMessage(`Error updating match: ${error.message}`);
    }
  };

  const handleSwipeRight = async () => {
    try {
      const db = getFirestore();
      const matchRef = doc(db, 'matches', `${currentUserId}_${otherUserId}`);
      const matchSnapshot = await getDoc(matchRef);

      if (matchSnapshot.exists()) {
        const matchData = matchSnapshot.data();
        if (matchData.otherUserSwipedRight) {
          await updateDoc(matchRef, { match: true });
        } else {
          await updateDoc(matchRef, { currentUserSwipedRight: true });
        }
      } else {
        await addDoc(collection(db, 'matches'), {
          userId1: currentUserId,
          userId2: otherUserId,
          currentUserSwipedRight: true,
          otherUserSwipedRight: false,
          match: false,
        });
      }

      navigation.navigate('HomeScreen');
    } catch (error) {
      setErrorMessage(`Error updating match: ${error.message}`);
    }
  };

  return (
    <GestureRecognizer
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      style={styles.container}
    >
      {otherUserProfile ? (
        <View style={styles.profileContainer}>
          <Image source={{ uri: otherUserProfile.profilePicture }} style={styles.profilePicture} />
          <Text style={styles.profileName}>{otherUserProfile.name}</Text>
        </View>
      ) : (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </GestureRecognizer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#232323',
  },
  profileContainer: {
    alignItems: 'center',
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
  },
});
