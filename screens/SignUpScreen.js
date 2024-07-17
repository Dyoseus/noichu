import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, firestore } from '../firebaseConfig';

const countryCodes = [
  { label: 'USA (+1)', value: '+1' },
  { label: 'UK (+44)', value: '+44' },
  { label: 'Australia (+61)', value: '+61' },

];

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  const handleSendVerificationCode = async () => {
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirm(confirmation);
      setStep(2);
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      await confirm.confirm(verificationCode);
      setStep(3);
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
  };

  const handleSignUp = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        const userDocRef = firestore().collection('users').doc(user.uid);
        await userDocRef.set({
          phoneNumber: `${countryCode}${phoneNumber}`,
          firstName: firstName,
          birthDate: birthDate,
          gender: gender,
        });
        console.log('User created successfully:', user.uid);
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        throw new Error('No authenticated user found');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    }
  };

  const renderStepOne = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Enter your phone number to begin</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={countryCode}
          style={styles.picker}
          onValueChange={(itemValue) => setCountryCode(itemValue)}
        >
          {countryCodes.map((country) => (
            <Picker.Item key={country.value} label={country.label} value={country.value} />
          ))}
        </Picker>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g. XXXXXXXXXX)"
        placeholderTextColor="#e0e0e0"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        autoFocus={true}
      />
      <TouchableOpacity style={styles.button} onPress={handleSendVerificationCode}>
        <Text style={styles.buttonText}>Send Code</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStepTwo = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
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
    </ScrollView>
  );

  const renderStepThree = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
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
    </ScrollView>
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      {renderCurrentStep()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#232323',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 12,
    borderColor: '#2f4f4f',
    borderWidth: 0.5,
    borderRadius: 15,
    backgroundColor: '#2f4f4f',
  },
  picker: {
    color: 'white',
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
