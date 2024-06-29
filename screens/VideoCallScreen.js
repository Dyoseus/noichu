import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../firebaseConfig';

export default function VideoCallScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Video Call Screen</Text>
      <Pressable onPress={() => console.log('Start call')}>
        <Text>Test</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
  },
});

