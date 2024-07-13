import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import firebase from '../firebaseConfig'; // Ensure this is correctly configured and imported
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState(null);

  const phoneInput = useRef(null);

  // Firebase Recaptcha Verifier
  const recaptchaVerifier = useRef(new firebase.auth.RecaptchaVerifier('recaptcha-container'));

  const handleSendVerificationCode = async () => {
    try {
      const phoneProvider = new firebase.auth.PhoneAuthProvider();
      const id = await phoneProvider.verifyPhoneNumber(
        phoneNumber, 
        recaptchaVerifier.current
      );
      setVerificationId(id);
      setStep(2);
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      await firebase.auth().signInWithCredential(credential);
      setStep(3);
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
  };

  const handleSignUp = async () => {
    try {
      const userId = 'user_' + Math.random().toString(36).substr(2, 9); // Generate a random user ID
      await setDoc(doc(db, 'users', userId), {
        phoneNumber: phoneNumber,
        firstName: firstName,
        birthDate: birthDate,
        gender: gender,
      });
      console.log('User created successfully:', userId);
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    }
  };

  // Render functions for each step
  const renderStepOne = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number to begin</Text>
      <TextInput
        ref={phoneInput}
        style={styles.input}
        placeholder="Phone Number (e.g. +1XXXXXXXXXX)"
        placeholderTextColor="#e0e0e0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoFocus={true}
      />
      <TouchableOpacity style={styles.button} onPress={handleSendVerificationCode}>
        <Text style={styles.buttonText}>Send Code</Text>
      </TouchableOpacity>
      <div id="recaptcha-container"></div> {/* This is required for Firebase reCAPTCHA */}
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <TextInput
        style={styles.input}
        placeholder="Verification Code"
        placeholderTextColor="#e0e0e0"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="number-pad"
      />
      <TouchableOpacity style={styles.button} onPress={handleVerifyCode}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepThree = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Text style={styles.title}>Tell us about yourself</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#e0e0e0"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Birth Date (YYYY-MM-DD)"
        placeholderTextColor="#e0e0e0"
        value={birthDate}
        onChangeText={setBirthDate}
      />
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'Male' && styles.selectedGenderButton]}
          onPress={() => setGender('Male')}
        >
          <Text style={styles.buttonText}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'Female' && styles.selectedGenderButton]}
          onPress={() => setGender('Female')}
        >
          <Text style={styles.buttonText}>Female</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'Nonbinary' && styles.selectedGenderButton]}
          onPress={() => setGender('Nonbinary')}
        >
          <Text style={styles.buttonText}>Nonbinary</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStepOne();
      case 2: return renderStepTwo();
      case 3: return renderStepThree();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#232323',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#2f4f4f',
    borderWidth: 0.5,
    borderRadius: 15,
    marginBottom: 12,
    paddingHorizontal: 8,
    color: 'white',
  },
  button: {
    backgroundColor: '#2f4f4f',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  genderButton: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#2f4f4f',
  },
  selectedGenderButton: {
    backgroundColor: '#2f4f4f',
  },
});