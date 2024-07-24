// VideoCallScreen.js

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView } from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

export default function VideoCallScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [callDocId, setCallDocId] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [callConnected, setCallConnected] = useState(false);
  const [otherUsername, setOtherUsername] = useState('');
  const [otherUserProfilePic, setOtherUserProfilePic] = useState(null);
  const [leavingCall, setLeavingCall] = useState(false); // New state for preventing multiple leave attempts
  const navigation = useNavigation();

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      setUserId(user.uid);
      requestAndStoreLocation(user.uid);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (callConnected && countdown === 0) {
      handleLeaveCall();
      navigation.navigate('PostCall', { userId: otherUsername });
    } else if (callConnected && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, callConnected]);

  const resetTimer = () => {
    setCountdown(60);
  };

  const requestAndStoreLocation = async (userId) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for better matchmaking. You can change this in your device settings.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      await storeLocationInFirebase(userId, latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again later.');
    }
  };

  const storeLocationInFirebase = async (userId, latitude, longitude) => {
    try {
      await firestore().collection('users').doc(userId).update({
        location: {
          latitude,
          longitude,
          lastUpdated: firestore.FieldValue.serverTimestamp()
        }
      });
      console.log('Location stored successfully');
    } catch (error) {
      console.error('Error storing location:', error);
      Alert.alert('Error', 'Failed to store location. Please try again later.');
    }
  };

  const initializePeerConnection = async () => {
    try {
      // Retrieve the Twilio token from the Firebase function
      const getTwilioToken = functions().httpsCallable('getTwilioToken');
      const result = await getTwilioToken();
      const configuration = { iceServers: result.data.iceServers };

      const pc = new RTCPeerConnection(configuration);
      setPeerConnection(pc);

      const stream = await setupLocalStream(pc);
      setLocalStream(stream);

      setupRemoteStreamListener(pc);
      setupICECandidateListener(pc);

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = async () => {
        if (pc.connectionState === 'connected') {
          setCallConnected(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          await handleLeaveCall();
        }
      };

      return pc;
    } catch (err) {
      handleError('Error initializing PeerConnection:', err);
    }
  };

  const setupLocalStream = async (pc) => {
    const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    return stream;
  };

  const setupRemoteStreamListener = (pc) => {
    pc.ontrack = event => setRemoteStream(event.streams[0]);
  };

  const setupICECandidateListener = (pc) => {
    pc.onicecandidate = handleICECandidate;
  };

  const handleICECandidate = (event) => {
    if (event.candidate) {
      console.log('New ICE candidate:', event.candidate);
    }
  };

  const handleJoinCall = async () => {
    if (inQueue || callDocId) {
      setErrorMessage('You are already in a call or in queue.');
      return;
    }

    const pc = await initializePeerConnection();
    if (!pc) {
      setErrorMessage('PeerConnection not initialized');
      return;
    }

    setInQueue(true);
    try {
      const findMatch = functions().httpsCallable('findMatch');
      const result = await findMatch();
      const { callDocId } = result.data;

      setCallDocId(callDocId);
      await setupCall(callDocId, pc);
      listenForCallEnd(callDocId);

      setErrorMessage('');
    } catch (error) {
      handleError('Error joining call:', error);
      setInQueue(false);
    }
  };

  const setupCall = async (callDocId, pc) => {
    const callDoc = firestore().collection('queue').doc(callDocId);
    const callData = (await callDoc.get()).data();

    if (callData.status === 'matched') {
      await fetchAndSetOtherUserInfo(callData.matchedUserId);
      await answerCall(callDocId, pc);
    } else {
      await createOffer(callDocId, pc);
    }
  };

  const fetchAndSetOtherUserInfo = async (otherUserId) => {
    try {
      const userDoc = await firestore().collection('users').doc(otherUserId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        setOtherUsername(userData.username);
        setOtherUserProfilePic(userData.profilePic);
      }
    } catch (error) {
      handleError('Error fetching other user\'s information:', error);
    }
  };

  const createOffer = async (callId, pc) => {
    const callDoc = firestore().collection('queue').doc(callId);
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        offerCandidates.add(event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.update({ offer });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        if (pc.signalingState === "have-local-offer") {
          pc.setRemoteDescription(answerDescription).catch(err => {
            handleError('Error setting remote description:', err);
          });
        }
      }
    });

    answerCandidates.onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch(err => {
            handleError('Error adding ICE candidate:', err);
          });
        }
      });
    });
  };

  const answerCall = async (callId, pc) => {
    const callDoc = firestore().collection('queue').doc(callId);
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    };

    try {
      const callSnapshot = await callDoc.get();
      if (!callSnapshot.exists) {
        throw new Error('Call document does not exist');
      }

      const callData = callSnapshot.data();
      if (!callData.offer) {
        throw new Error('Offer not found in call document');
      }

      const offerDescription = new RTCSessionDescription(callData.offer);

      if (pc.signalingState !== "stable") {
        await pc.setLocalDescription({ type: "rollback" });
      }

      await pc.setRemoteDescription(offerDescription);
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await callDoc.update({ answer });

      offerCandidates.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate).catch(err => {
              handleError('Error adding ICE candidate:', err);
            });
          }
        });
      });

    } catch (error) {
      handleError('Error answering call:', error);
    }
  };

  const handleLeaveCall = async () => {
    if (leavingCall) return;
    setLeavingCall(true);
    console.log('Attempting to leave call:', { callDocId, peerConnection });

    try {
      if (!callDocId) {
        console.warn('No active call to leave');
        resetState();
        return;
      }

      const leaveCall = functions().httpsCallable('leaveCall');
      await leaveCall({ callDocId });

      // Clean up local resources
      cleanupResources();

      // Reset state
      resetState();

    } catch (error) {
      console.error('Error leaving call:', error);
      // Log the full error object for debugging
      console.log('Full error object:', JSON.stringify(error, null, 2));

      // Handle specific error types
      if (error.code === 'not-found') {
        console.warn('Call document not found. It may have already been cleaned up.');
        resetState();
      } else {
        setErrorMessage(`Failed to leave call: ${error.message}`);
      }
    } finally {
      setLeavingCall(false);
    }
  };

  const cleanupResources = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
  };

  const resetState = () => {
    setPeerConnection(null);
    setLocalStream(null);
    setRemoteStream(null);
    setErrorMessage('');
    setInQueue(false);
    setCallDocId(null);
    setCallConnected(false);
    resetTimer();
  };

  const listenForCallEnd = (callId) => {
    const callDoc = firestore().collection('queue').doc(callId);

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data && data.status === 'ended') {
        handleLeaveCall();
      }
    });
  };

  const handleError = (message, error) => {
    console.error(message, error);
    setErrorMessage(`${message} ${error.message}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {callConnected && (
        <View style={styles.header}>
          <Pressable onPress={handleLeaveCall} style={styles.leaveButton}>
            <Image source={require('../assets/arrow.png')} style={styles.leaveImage} />
          </Pressable>
          {otherUserProfilePic && <Image source={{ uri: otherUserProfilePic }} style={styles.profilePic} />}
          <Text style={styles.title}>Video with {otherUsername}</Text>
        </View>
      )}
      <View style={styles.container}>
        {remoteStream && (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
        )}
        {localStream && (
          <RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
        )}
        <Pressable
          style={[styles.button, styles.joinButton]}
          onPress={handleJoinCall}
          disabled={!!(inQueue || callDocId)}
        >
          <Text style={styles.buttonText}>Find a Call</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.leaveButton]}
          onPress={handleLeaveCall}
          disabled={false}
        >
          <Text style={styles.buttonText}>Leave Call</Text>
        </Pressable>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {callConnected && <Text style={styles.countdownText}>{countdown}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#232323',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#2f4f4f',
  },
  leaveButton: {
    position: 'absolute',
    left: 10,
  },
  leaveImage: {
    width: 25,
    height: 25,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  localVideo: {
    position: 'absolute',
    width: 100,
    height: 150,
    bottom: 10,
    right: 10,
    borderRadius: 10,
    backgroundColor: 'black',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
  button: {
    width: '90%',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  joinButton: {
    backgroundColor: 'green',
  },
  leaveButton: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
  countdownText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
});
