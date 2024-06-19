import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text , Image} from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app, db } from '../firebaseConfig'; // Make sure you are importing the initialized Firebase app

const auth = getAuth(app);

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save the username and email in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        email: email,
      });

      console.log('Registered with:', user.email);
      navigation.navigate('Login');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.loginButton} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('Login')}>
        <Text >Back to Login</Text>
      </TouchableOpacity>
    
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5E7B2', // Set a background color for the container
  },
  input: {
    height: 40,
    borderColor: '#F9D689',
    borderWidth: 0.5,
    borderRadius: 15,
    marginBottom: 12,
    paddingHorizontal: 8,
    color: '#973131',
  },
  loginButton: {
    backgroundColor: '#E0A75E',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpButton: {
    //backgroundColor: 'rgb(29,30,150)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white', // Set text color for buttons
    fontWeight: 'bold',
  },
});
