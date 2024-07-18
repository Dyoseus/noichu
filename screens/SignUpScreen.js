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
  ScrollView,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { auth, firestore } from '../firebaseConfig';
import countryCodes from '../constants/countryCodes';


export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');


  const filteredCountryCodes = countryCodes.filter(country => 
    country.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.value.includes(searchQuery)
  );

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
          email: email,
          firstName: firstName,
          birthDate: birthDate,
          gender: gender,
        });
        console.log('User created successfully:', user.uid);
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('App') }
        ]);
      } else {
        throw new Error('No authenticated user found');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user. Please try again.');
    }
  };

  const CountryCodeSelector = ({ selectedCode, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountryCodes = countryCodes.filter(country => 
      country.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.value.includes(searchQuery)
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search country or code"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredCountryCodes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryLabel}>{item.label}</Text>
                  <Text style={styles.countryCode}>{item.value}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
};

  const renderStepOne = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Enter your phone number to begin</Text>
      <View style={styles.phoneInputContainer}>
        <TouchableOpacity
          style={styles.countryCodeButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.countryCodeButtonText}>{countryCode}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.phoneInput}
          placeholder="Phone Number (e.g. XXXXXXXXXX)"
          placeholderTextColor="#e0e0e0"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoFocus={true}
        />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleSendVerificationCode}>
        <Text style={styles.buttonText}>Send Code</Text>
      </TouchableOpacity>
      <CountryCodeSelector
        selectedCode={countryCode}
        onSelect={(code) => setCountryCode(code)}
      />
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
      <Text style={styles.title}>Enter your email in case you lose access</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#e0e0e0"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.button} onPress={() => setStep(4)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStepFour = () => (
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
      case 4: return renderStepFour();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <TouchableOpacity style={[styles.backButton, Platform.OS === 'ios' && styles.backButtonIOS]} onPress={() => navigation.goBack()}>
        <Image source={require('../assets/arrow.png')} style={styles.backButtonImage} />
      </TouchableOpacity>
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
  searchInput: {
    height: 40,
    borderColor: '#2f4f4f',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: 'white',
    backgroundColor: '#333',
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
  },
  backButtonIOS: {
    top: 60,
  },
  backButtonImage: {
    width: 25,
    height: 25,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  countryCodeButton: {
    backgroundColor: '#2f4f4f',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  countryCodeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    height: 40,
    borderColor: '#2f4f4f',
    borderWidth: 0.5,
    borderRadius: 15,
    paddingHorizontal: 8,
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2f4f4f',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  countryLabel: {
    flex: 1,
    color: 'white',
  },
  countryCode: {
    color: 'white',
    fontWeight: 'bold',
  },
});
