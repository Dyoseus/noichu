import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { RTCView } from 'react-native-webrtc';
import { mediaDevices } from 'react-native-webrtc';

const configuration = {"iceServers": [{"urls": "stun:stun.l.google.com:19302"}]};

export default function VideoCallScreen() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [callDocId, setCallDocId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserId(user.uid);
    }
  }, []);

  const initializePeerConnection = async () => {
    try {
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
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
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
      const db = getFirestore();
      const queueRef = collection(db, 'queue');
      const q = query(queueRef, where('status', '==', 'waiting'), where('userId', '!=', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const callDoc = await addDoc(queueRef, { userId, status: 'waiting' });
        setCallDocId(callDoc.id);
        await createOffer(callDoc.id, pc);
        listenForCallEnd(callDoc.id);
      } else {
        const callDoc = querySnapshot.docs[0];
        setCallDocId(callDoc.id);
        await answerCall(callDoc.id, pc);
        await updateDoc(callDoc.ref, { status: 'connected' });
        listenForCallEnd(callDoc.id);
      }

      setErrorMessage('');
    } catch (error) {
      handleError('Error joining call:', error);
    }
  };

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
          pc.setRemoteDescription(answerDescription).catch(err => {
            handleError('Error setting remote description:', err);
          });
        }
      }
    });

    onSnapshot(answerCandidates, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate).catch(err => {
            handleError('Error adding ICE candidate:', err);
          });
        }
      });
    });

    return callDoc.id;
  };

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
        await pc.setLocalDescription({ type: "rollback" });
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
    try {
      const db = getFirestore();

      // Set the call status to 'ended' in Firestore to notify the other user
      if (callDocId) {
        const callDoc = doc(db, 'queue', callDocId);
        await updateDoc(callDoc, { status: 'ended' });
      }

      // Stop all local tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      // Stop all remote tracks
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }

      // Close the peer connection
      if (peerConnection) {
        peerConnection.close();
      }

      // Delete the room and its candidates from Firestore
      if (callDocId) {
        const callDoc = doc(db, 'queue', callDocId);
        const offerCandidates = await getDocs(collection(callDoc, 'offerCandidates'));
        offerCandidates.forEach(async (candidate) => {
          await deleteDoc(candidate.ref);
        });
        const answerCandidates = await getDocs(collection(callDoc, 'answerCandidates'));
        answerCandidates.forEach(async (candidate) => {
          await deleteDoc(candidate.ref);
        });
        await deleteDoc(callDoc);
      }

      // Reset state
      setPeerConnection(null);
      setLocalStream(null);
      setRemoteStream(null);
      setErrorMessage('');
      setInQueue(false);
      setCallDocId(null);

      // Optional: reload the app to reset UI
      // window.location.reload();

    } catch (error) {
      handleError('Error leaving call:', error);
    }
  };

  const listenForCallEnd = (callId) => {
    const db = getFirestore();
    const callDoc = doc(db, 'queue', callId);

    onSnapshot(callDoc, (snapshot) => {
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
        >
          <Text style={styles.buttonText}>{inQueue || callDocId ? 'In Call' : 'Join Call'}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.leaveButton]}
          onPress={handleLeaveCall}
        >
          <Text style={styles.buttonText}>Leave Call</Text>
        </Pressable>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#232323',
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
});
