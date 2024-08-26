import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Swiper from 'react-native-swiper';
import ViewShot from 'react-native-view-shot';

const { width } = Dimensions.get('window');

export default function PostCallScreen({ route }) {
  const { userId, callId, screenshots } = route.params;
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const navigation = useNavigation();
  const currentUser = auth().currentUser;
  const viewShotRef = React.useRef();

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

  const handleReport = async () => {
    Alert.alert(
      "Report User",
      "Are you sure you want to report this user?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Report", 
          onPress: async () => {
            try {
              // Capture a screenshot of the current view
              const uri = await viewShotRef.current.capture();

              // Upload the screenshot to Firebase Storage
              const screenshotRef = storage().ref(`reports/${callId}_${Date.now()}.jpg`);
              await screenshotRef.putFile(uri);

              // Get the download URL of the uploaded screenshot
              const downloadURL = await screenshotRef.getDownloadURL();

              // Upload call screenshots to Firebase Storage
              const screenshotUrls = await Promise.all(screenshots.map(async (screenshot, index) => {
                const screenshotRef = storage().ref(`reports/${callId}_call_${index}.jpg`);
                await screenshotRef.putFile(screenshot);
                return await screenshotRef.getDownloadURL();
              }));

              // Create a report document in Firestore
              await firestore().collection('reports').add({
                reportedUserId: userId,
                reportedByUserId: currentUser.uid,
                callId: callId,
                timestamp: firestore.FieldValue.serverTimestamp(),
                postCallScreenshotUrl: downloadURL,
                callScreenshotUrls: screenshotUrls,
              });

              Alert.alert("Report Submitted", "Thank you for your report. We will review it shortly.");
              navigation.navigate('Video');
            } catch (error) {
              console.error('Error submitting report:', error);
              Alert.alert("Error", "Failed to submit report. Please try again.");
            }
          }
        }
      ]
    );
  };

  if (!otherUserProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ViewShot ref={viewShotRef} style={styles.container}>
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
      <Pressable
        style={[styles.button, styles.reportButton]}
        onPress={handleReport}
      >
        <Text style={styles.buttonText}>Report User</Text>
      </Pressable>
    </ViewShot>
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
  reportButton: {
    backgroundColor: '#FF9800',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});