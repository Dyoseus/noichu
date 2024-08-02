// VideoCallScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView } from 'react-native-webrtc';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';

export default function VideoCallScreen() {
  const [user, setUser] = useState(null);
  const [inQueue, setInQueue] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callId, setCallId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [callConnected, setCallConnected] = useState(false);
  const peerConnection = useRef(null);
  const navigation = useNavigation();
  const appState = useRef(AppState.currentState);
  const isFocused = useIsFocused();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        requestAndStoreLocation(user.uid);
      } else {
        navigation.navigate('Login');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timer;
    if (callConnected && countdown === 0) {
      handleLeaveCall();
    } else if (callConnected && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, callConnected]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (inQueue) {
          leaveQueue();
        }
        if (callConnected) {
          handleLeaveCall();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [inQueue, callConnected]);

  useEffect(() => {
    let unsubscribe;
    if (callId && isFocused) {
      unsubscribe = firestore().collection('calls').doc(callId)
        .onSnapshot((snapshot) => {
          const data = snapshot.data();
          if (data && data.status === 'ended') {
            handleCallEnded();
          }
        });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [callId, isFocused]);

  const requestAndStoreLocation = async (userId) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for better matchmaking. You can change this in your device settings.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      await firestore().collection('users').doc(userId).update({
        location: {
          latitude,
          longitude,
          lastUpdated: firestore.FieldValue.serverTimestamp()
        }
      });
    } catch (error) {
      console.error('Error getting or storing location:', error);
      Alert.alert('Location Error', 'Unable to get or store your current location. Please try again later.');
    }
  };

  const findMatch = async () => {
    if (!user) return;
  
    setInQueue(true);
    try {
      const findMatchFunction = functions().httpsCallable('findMatch');
      await findMatchFunction();
  
      const queueRef = firestore().collection('matchQueue').doc(user.uid);
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();
  
      const unsubscribe = firestore().collection('matchQueue')
        .where('gender', '==', userData.interestedIn[0]) // Assuming interestedIn array has at least one element
        .where('interestedIn', 'array-contains', userData.gender)
        .orderBy('timestamp')
        .limit(1)
        .onSnapshot(async (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const matchDoc = snapshot.docs[0];
            if (matchDoc && matchDoc.id !== user.uid) {
              const matchData = matchDoc.data();
              if (matchData && matchData.userId) {
                // Check if the user has already been matched with this person
                const pastMatches = userData.pastMatches || [];
                if (pastMatches.includes(matchData.userId)) {
                  console.log('Already matched with this user, finding another match...');
                  return;
                }
  
                // Additional check to ensure the matched user is still in the queue
                const matchQueueDoc = await firestore().collection('matchQueue').doc(matchData.userId).get();
                if (!matchQueueDoc.exists) {
                  console.log('Matched user has left the queue, finding another match...');
                  return;
                }
  
                setMatchedUser(matchData);
  
                const callId = [user.uid, matchData.userId].sort().join('_');
                setCallId(callId);
                const callRef = firestore().collection('calls').doc(callId);
                await callRef.set({
                  users: [user.uid, matchData.userId],
                  startedAt: firestore.FieldValue.serverTimestamp(),
                });
  
                try {
                  await queueRef.delete();
                  await firestore().collection('matchQueue').doc(matchData.userId).delete();
                } catch (error) {
                  console.error("Error removing users from queue:", error);
                }
  
                // Update past matches for both users
                await firestore().collection('users').doc(user.uid).update({
                  pastMatches: firestore.FieldValue.arrayUnion(matchData.userId)
                });
                await firestore().collection('users').doc(matchData.userId).update({
                  pastMatches: firestore.FieldValue.arrayUnion(user.uid)
                });
  
                unsubscribe();
  
                initializeWebRTC(callId, matchData.userId);
              }
            }
          }
        }, (error) => {
          console.error("Error in matchQueue snapshot:", error);
          setInQueue(false);
        });
  
      return () => {
        unsubscribe();
        queueRef.delete().catch(error => console.error("Error removing user from queue:", error));
      };
    } catch (error) {
      console.error("Error finding match:", error);
      setInQueue(false);
      setErrorMessage("Error finding match. Please try again.");
    }
  };

  const leaveQueue = async () => {
    if (!user) return;

    try {
      const queueRef = firestore().collection('matchQueue').doc(user.uid);
      await queueRef.delete();
      setInQueue(false);
    } catch (error) {
      console.error("Error leaving queue:", error);
      setErrorMessage("Error leaving queue. Please try again.");
    }
  };

  const initializeWebRTC = async (callId, matchedUserId) => {
    try {
      const twilioToken = await functions().httpsCallable('getTwilioToken')();
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: twilioToken.data.iceServers,
      });
    
      const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
    
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    
      peerConnection.current.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
    
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendICECandidate(callId, event.candidate.toJSON());
        }
      };
  
      peerConnection.current.onconnectionstatechange = (event) => {
        console.log('Connection state change:', peerConnection.current.connectionState);
        if (peerConnection.current.connectionState === 'connected') {
          setCallConnected(true);
        } else if (peerConnection.current.connectionState === 'failed') {
          console.error('Peer connection failed');
          setErrorMessage('Connection failed. Please try again.');
          handleLeaveCall();
        }
      };
    
      if (user.uid < matchedUserId) {
        await createOffer(callId);
        await handleAnswer(callId);
      } else {
        await listenForOffer(callId);
      }
    
      listenForICECandidates(callId);
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      setErrorMessage("Error initializing call. Please try again.");
    }
  };

  const createOffer = async (callId) => {
    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
  
      await firestore().collection('calls').doc(callId).update({
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      setErrorMessage("Error creating offer. Please try again.");
    }
  };
  
  const listenForOffer = async (callId) => {
    const callRef = firestore().collection('calls').doc(callId);
    const unsubscribe = callRef.onSnapshot(async (snapshot) => {
      const data = snapshot.data();
      if (data && data.offer && !peerConnection.current.remoteDescription) {
        try {
          const offer = new RTCSessionDescription(data.offer);
          await peerConnection.current.setRemoteDescription(offer);
  
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
  
          await callRef.update({
            answer: {
              type: answer.type,
              sdp: answer.sdp
            }
          });
  
          unsubscribe(); // Stop listening after processing the offer
        } catch (error) {
          console.error("Error handling offer:", error);
          setErrorMessage("Error establishing connection. Please try again.");
          unsubscribe();
        }
      }
    });
  };

  const sendICECandidate = async (callId, candidate) => {
    try {
      await firestore().collection('calls').doc(callId).collection('iceCandidates').add(candidate);
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
    }
  };

  const listenForICECandidates = async (callId) => {
    const callRef = firestore().collection('calls').doc(callId);
    const candidatesBuffer = new Set();
  
    callRef.collection('iceCandidates').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data();
          const candidateString = JSON.stringify(candidateData);
          
          if (!candidatesBuffer.has(candidateString)) {
            candidatesBuffer.add(candidateString);
            const candidate = new RTCIceCandidate(candidateData);
            if (peerConnection.current.remoteDescription) {
              try {
                await peerConnection.current.addIceCandidate(candidate);
              } catch (error) {
                console.error('Error adding ICE candidate:', error);
              }
            }
          }
        }
      });
    });
  
    peerConnection.current.addEventListener('setRemoteDescription', async () => {
      for (const candidateString of candidatesBuffer) {
        try {
          const candidateData = JSON.parse(candidateString);
          const candidate = new RTCIceCandidate(candidateData);
          await peerConnection.current.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding buffered ICE candidate:', error);
        }
      }
      candidatesBuffer.clear();
    });
  };

  const handleAnswer = async (callId) => {
    const callRef = firestore().collection('calls').doc(callId);
  
    return new Promise((resolve, reject) => {
      const unsubscribe = callRef.onSnapshot(async (snapshot) => {
        const data = snapshot.data();
        if (data && data.answer && peerConnection.current.signalingState === 'have-local-offer') {
          try {
            const answer = new RTCSessionDescription(data.answer);
            await peerConnection.current.setRemoteDescription(answer);
            unsubscribe();
            resolve();
          } catch (error) {
            console.error('Error handling answer:', error);
            setErrorMessage('Error establishing connection. Please try again.');
            unsubscribe();
            reject(error);
          }
        }
      });
    });
  };

  const handleCallEnded = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setMatchedUser(null);
    setInQueue(false);
    setCallId(null);
    setCallConnected(false);
    setCountdown(60);

    navigation.navigate('PostCall', { userId: matchedUser?.userId });
  };

  const handleLeaveCall = async () => {
    try {
      if (callId) {
        const leaveCall = functions().httpsCallable('leaveCall');
        await leaveCall({ callId });
        
        // Update call status in Firestore
        await firestore().collection('calls').doc(callId).update({
          status: 'ended',
          endedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      
      handleCallEnded();
    } catch (error) {
      console.error("Error leaving call:", error);
      setErrorMessage("Error ending call. Please try again.");
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      )}
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1}
        />
      )}
        {!inQueue && !callConnected && (
          <Pressable
            style={[styles.button, styles.findButton]}
            onPress={findMatch}
          >
            <Text style={styles.buttonText}>Find a Match</Text>
          </Pressable>
        )}
        {inQueue && !callConnected && (
          <>
            <Text style={styles.waitingText}>Waiting for a match...</Text>
            <Pressable
              style={[styles.button, styles.leaveButton]}
              onPress={leaveQueue}
            >
              <Text style={styles.buttonText}>Leave Queue</Text>
            </Pressable>
          </>
        )}
        {callConnected && (
          <Pressable
            style={[styles.button, styles.endCallButton]}
            onPress={handleLeaveCall}
          >
            <Text style={styles.buttonText}>End Call</Text>
          </Pressable>
        )}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {callConnected && <Text style={styles.countdownText}>{countdown}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  remoteVideo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  localVideo: {
    position: 'absolute',
    width: 100,
    height: 150,
    top: 10,
    right: 10,
    zIndex: 2,
  },
  endCallButton: {
    backgroundColor: '#f44336',
    position: 'absolute',
    bottom: 30,
    width: 150,
    height: 50,
  },
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
    tintColor: 'white',
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
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  localVideo: {
    position: 'absolute',
    width: 100,
    height: 150,
    top: 10,
    right: 10,
    zIndex: 2,
  },
  button: {
    width: '90%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  findButton: {
    backgroundColor: '#4CAF50',
  },
  leaveButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 10,
    textAlign: 'center',
  },
  countdownText: {
    position: 'absolute',
    top: 20,
    right: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
});
