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
import * as AuthSession from 'expo-auth-session';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Import db from your config file

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState(null);
  const [verificationId, setVerificationId] = useState(null);

  const phoneInput = useRef(null);

  const handleSendVerificationCode = async () => {
    try {
      const formattedPhoneNumber = `+${phoneNumber.replace(/\D/g, '')}`;
      const request = await AuthSession.startAsync({
        authUrl:
          `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/createPhoneAuthRequest?phone=${formattedPhoneNumber}`
      });
      if (request.type === 'success') {
        setVerificationId(request.params.verificationId);
        setStep(2);
      } else {
        throw new Error('Phone number verification failed');
      }
    } catch (error) {
      console.error('Error sending verification code:', error.message);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      const request = await AuthSession.startAsync({
        authUrl:
          `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/verifyPhoneAuthCode?verificationId=${verificationId}&code=${verificationCode}`
      });
      if (request.type === 'success') {
        setStep(3);
      } else {
        throw new Error('Code verification failed');
      }
    } catch (error) {
      console.error('Error verifying code:', error.message);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
  };

  const handleSignUp = async () => {
    try {
      // Here you would typically create a user in your authentication system
      // For this example, we'll just create a document in Firestore
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
      console.error('Error creating user:', error.message);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    }
  };

  const renderStepOne = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number to begin</Text>
      <TextInput
        ref={phoneInput} // Add ref here
        style={styles.input}
        placeholder="Phone Number (e.g. +1XXXXXXXXXX)"
        placeholderTextColor="#e0e0e0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoFocus={true} // Autofocus on the input
      />
      <TouchableOpacity style={styles.button} onPress={handleSendVerificationCode}>
        <Text style={styles.buttonText}>Send Code</Text>
      </TouchableOpacity>
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
