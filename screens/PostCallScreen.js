// PostCallScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Swiper from 'react-native-swiper';

const { width } = Dimensions.get('window');

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
      const currentUserRef = firestore().collection('users').doc(currentUser.uid);
      const otherUserRef = firestore().collection('users').doc(userId);

      if (vote === 'upvote') {
        // Record the upvote
        await currentUserRef.update({
          upvotes: firestore.FieldValue.arrayUnion(userId)
        });

        // Send a friend request
        await firestore().collection('friendRequests').add({
          from: currentUser.uid,
          to: userId,
          status: 'pending',
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

        // Check if the other user has also sent a friend request to this user
        const friendRequestSnapshot = await firestore().collection('friendRequests')
          .where('from', '==', userId)
          .where('to', '==', currentUser.uid)
          .where('status', '==', 'pending')
          .get();

        if (!friendRequestSnapshot.empty) {
          // Both users have sent friend requests to each other, confirm friendship
          await firestore().collection('friends').add({
            users: [currentUser.uid, userId],
            createdAt: firestore.FieldValue.serverTimestamp()
          });

          // Remove pending friend requests
          const friendRequests = await firestore().collection('friendRequests')
            .where('from', 'in', [currentUser.uid, userId])
            .where('to', 'in', [currentUser.uid, userId])
            .get();

          friendRequests.forEach(async (doc) => {
            await doc.ref.delete();
          });
        }

        console.log('Friend request sent');
      } else {
        // Record the downvote
        await currentUserRef.update({
          downvotes: firestore.FieldValue.arrayUnion(userId)
        });

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
      <View style={styles.swiperContainer}>
        <Swiper 
          style={styles.wrapper} 
          showsButtons={true}
          loop={false}
          dot={<View style={styles.dot} />}
          activeDot={<View style={styles.activeDot} />}
        >
          {otherUserProfile.pictures && otherUserProfile.pictures.map((picture, index) => (
            <View style={styles.slide} key={index}>
              <Image source={{ uri: picture }} style={styles.image} />
            </View>
          ))}
        </Swiper>
      </View>
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.upvoteButton]}
          onPress={() => handleVote('upvote')}
        >
          <Text style={styles.buttonText}>❤️</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.downvoteButton]}
          onPress={() => handleVote('downvote')}
        >
          <Text style={styles.buttonText}>🗑️</Text>
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
  swiperContainer: {
    height: 400,
    width: width - 32,
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 10,
  },
  dot: {
    backgroundColor: 'rgba(255,255,255,.3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
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