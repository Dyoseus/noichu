import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Button, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, addDoc, collection, updateDoc } from 'firebase/firestore';
import { RTCView } from 'react-native-webrtc';
import { mediaDevices } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const configuration = {"iceServers": [{"urls": "stun:stun.l.google.com:19302"}]};

export default function VideoCallScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callId, setCallId] = useState('');
  const [peerConnection, setPeerConnection] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Initialize PeerConnection
    const initializePeerConnection = async () => {
      try {
        const pc = new RTCPeerConnection(configuration);
        setPeerConnection(pc);

        // Setup local media stream
        const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Setup listener for remote stream
        pc.ontrack = event => {
          setRemoteStream(event.streams[0]);
        };

        // Setup ICE candidate handling
        pc.onicecandidate = handleICECandidate;

        // Cleanup function
        return () => {
          if (pc) {
            pc.close();
          }
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
        };
      } catch (err) {
        console.error('Error initializing PeerConnection:', err);
        setErrorMessage(`Failed to initialize: ${err.message}`);
      }
    };

    initializePeerConnection();
  }, []);

  const handleICECandidate = (event) => {
    if (event.candidate) {
      console.log('New ICE candidate:', event.candidate);
    }
  };

  const handleStartCall = async () => {
    if (peerConnection) {
      try {
        const id = await createOffer();
        setCallId(id);
      } catch (error) {
        console.error('Error starting call:', error);
        setErrorMessage(`Failed to start call: ${error.message}`);
      }
    } else {
      setErrorMessage('PeerConnection not initialized');
    }
  };

  const handleJoinCall = async () => {
    if (!peerConnection) {
      setErrorMessage('PeerConnection not initialized');
      return;
    }

    try {
      await answerCall(callId);
      setErrorMessage(''); // Clear any previous error messages
    } catch (error) {
      console.error('Error joining call:', error);
      setErrorMessage(`Failed to join call: ${error.message}`);
    }
  };

  const createOffer = async () => {
    const db = getFirestore();
    const callDoc = doc(collection(db, 'calls'));
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        if (peerConnection.signalingState === "have-local-offer") {
          peerConnection.setRemoteDescription(answerDescription);
        }
      }
    });

    onSnapshot(answerCandidates, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.addIceCandidate(candidate);
        }
      });
    });

    return callDoc.id;
  };

  const answerCall = async (callId) => {
    const db = getFirestore();
    const callDoc = doc(db, 'calls', callId);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    peerConnection.onicecandidate = event => {
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
      
      // Check the connection state before setting remote description
      if (peerConnection.signalingState !== "stable") {
        console.log("Peer connection is not in stable state. Resetting...");
        await peerConnection.setLocalDescription({type: "rollback"});
      }

      await peerConnection.setRemoteDescription(offerDescription);
      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await updateDoc(callDoc, { answer });

      onSnapshot(offerCandidates, snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            peerConnection.addIceCandidate(candidate);
          }
        });
      });

    } catch (error) {
      console.error('Error answering call:', error);
      setErrorMessage(`Failed to join call: ${error.message}`);
    }
  };

  return (
      <View style={styles.container}>
          {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} />}
          {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.video} />}
          <TextInput style={styles.input} placeholder="Enter Call ID" value={callId} onChangeText={setCallId} />
          <Button title="Start Call" onPress={handleStartCall} />
          <Button title="Join Call" onPress={handleJoinCall} />
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
  video: {
      width: '100%',
      height: 300,
      backgroundColor: 'black',
  },
  input: {
      width: '90%',
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      marginTop: 20,
      padding: 10,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
});