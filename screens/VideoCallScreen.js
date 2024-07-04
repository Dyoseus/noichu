import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, addDoc, collection, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { RTCView } from 'react-native-webrtc';
import { mediaDevices } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const configuration = {"iceServers": [{"urls": "stun:stun.l.google.com:19302"}]};

export default function VideoCallScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    initializePeerConnection();
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
  }, []);

  // Initialize the peer connection and set up local and remote streams
  const initializePeerConnection = async () => {
    try {
      const pc = new RTCPeerConnection(configuration);
      setPeerConnection(pc);
      const stream = await setupLocalStream(pc);
      setLocalStream(stream);
      setupRemoteStreamListener(pc);
      setupICECandidateListener(pc);
      return pc;
    } catch (err) {
      handleError('Error initializing PeerConnection:', err);
    }
  };

  // Set up the local media stream (video and audio) and add tracks to the peer connection
  const setupLocalStream = async (pc) => {
    const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    return stream;
  };

  // Listen for remote media streams and set the remote stream state
  const setupRemoteStreamListener = (pc) => {
    pc.ontrack = event => setRemoteStream(event.streams[0]);
  };

  // Listen for ICE candidates and handle them
  const setupICECandidateListener = (pc) => {
    pc.onicecandidate = handleICECandidate;
  };

  // Handle new ICE candidates
  const handleICECandidate = (event) => {
    if (event.candidate) {
      console.log('New ICE candidate:', event.candidate);
    }
  };

  // Join a random call by either creating an offer or answering an existing one
  const handleJoinCall = async () => {
    const pc = await initializePeerConnection();
    if (!pc) {
      setErrorMessage('PeerConnection not initialized');
      return;
    }

    try {
      const db = getFirestore();
      const queueRef = collection(db, 'queue');
      const q = query(queueRef, where('status', '==', 'waiting'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No waiting users, create a new call
        const callDoc = await addDoc(queueRef, { userId, status: 'waiting' });
        await createOffer(callDoc.id, pc);
        listenForCallEnd(callDoc.id); // Listen for call end
      } else {
        // Join an existing call
        const callDoc = querySnapshot.docs[0];
        await answerCall(callDoc.id, pc);
        await updateDoc(callDoc.ref, { status: 'connected' });
        listenForCallEnd(callDoc.id); // Listen for call end
      }

      setErrorMessage('');
    } catch (error) {
      handleError('Error joining call:', error);
    }
  };

  // Create an offer and set up the call document in Firestore
  const createOffer = async (callId, pc) => {
    const db = getFirestore();
    const callDoc = doc(db, 'queue', callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await updateDoc(callDoc, { offer });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        if (pc.signalingState === "have-local-offer") {
          pc.setRemoteDescription(answerDescription);
        }
      }
    });

    onSnapshot(answerCandidates, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });

    return callDoc.id;
  };

  // Answer an existing call by setting the remote description and creating an answer
  const answerCall = async (callId, pc) => {
    const db = getFirestore();
    const callDoc = doc(db, 'queue', callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = event => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    try {
      const callSnapshot = await getDoc(callDoc);
      if (!callSnapshot.exists()) {
        throw new Error('Call document does not exist');
      }

      const callData = callSnapshot.data();
      if (!callData.offer) {
        throw new Error('Offer not found in call document');
      }

      const offerDescription = new RTCSessionDescription(callData.offer);
      
      if (pc.signalingState !== "stable") {
        console.log("Peer connection is not in stable state. Resetting...");
        await pc.setLocalDescription({type: "rollback"});
      }

      await pc.setRemoteDescription(offerDescription);
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await updateDoc(callDoc, { answer });

      onSnapshot(offerCandidates, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate);
          }
        });
      });

    } catch (error) {
      handleError('Error answering call:', error);
    }
  };

  const handleLeaveCall = async () => {
    if (peerConnection) {
      const db = getFirestore();
      const queueRef = collection(db, 'queue');
      const q = query(queueRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const callDoc = querySnapshot.docs[0];
        await updateDoc(callDoc.ref, { status: 'ended' });
        await deleteDoc(callDoc.ref);
      }

      await peerConnection.close();
      setPeerConnection(null);
      setLocalStream(null);
      setRemoteStream(null);
      setErrorMessage('');
    }
  };

  const listenForCallEnd = (callId) => {
    const db = getFirestore();
    const callDoc = doc(db, 'queue', callId);

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!snapshot.exists() || data?.status === 'ended') {
        handleLeaveCall();
      }
    });
  };

  const handleError = (message, error) => {
    console.error(message, error);
    setErrorMessage(`${message} ${error.message}`);
  };

  return (
    <View style={styles.container}>
      {remoteStream && (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
      )}
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
      )}
      <Pressable style={[styles.button, styles.joinButton]} onPress={handleJoinCall}>
        <Text style={styles.buttonText}>Join Call</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.leaveButton]} onPress={handleLeaveCall}>
        <Text style={styles.buttonText}>Leave Call</Text>
      </Pressable>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});