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
import { auth, firestore, storage } from '../firebaseConfig';
import countryCodes from '../constants/countryCodes';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator } from 'react-native';

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
  const [email, setEmail] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [gender, setGender] = useState('');
  const [sexualOrientation, setSexualOrientation] = useState('');
  const [interestedIn, setInterestedIn] = useState([]);
  const [maxDistance, setMaxDistance] = useState(50);
  const [school, setSchool] = useState('');
  const [lifestyleHabits, setLifestyleHabits] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [pictures, setPictures] = useState([]);
  const [uploading, setUploading] = useState(false);
  


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
          sexualOrientation: sexualOrientation,
          interestedIn: interestedIn,
          maxDistance: maxDistance,
          school: school,
          lifestyleHabits: lifestyleHabits,
          hobbies: hobbies,
          pictures: pictures,
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
      <Text style={styles.title}>Terms and Conditions</Text>
      {/* Add your terms and conditions text here */}
      <TouchableOpacity style={styles.checkbox} onPress={() => setAgreeToTerms(!agreeToTerms)}>
        <Text style={styles.checkboxText}>I agree to the terms and conditions</Text>
        {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => setStep(6)} disabled={!agreeToTerms}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStepSix = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>What's your first name?</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        placeholderTextColor="#e0e0e0"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TouchableOpacity style={styles.button} onPress={() => setStep(7)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const handleBirthDateChange = (text) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    } else if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    setBirthDate(formatted);
  };

  const validateBirthDate = (date) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!regex.test(date)) return false;

    const [month, day, year] = date.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    return birthDate.getMonth() === month - 1 && birthDate.getDate() === day && birthDate.getFullYear() === year;
  };

  const calculateAge = (birthDateString) => {
    const today = new Date();
    const [month, day, year] = birthDateString.split('/').map(Number);
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleNextStep = () => {
    if (!validateBirthDate(birthDate)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format.');
      return;
    }

    const age = calculateAge(birthDate);
    if (age < 18) {
      Alert.alert('Age Restriction', 'You must be at least 18 years old to use this app.');
      return;
    }

    setStep(8); // Move to the next step
  };

  const renderStepSeven = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>When's your birthday?</Text>
      <TextInput
        style={styles.input}
        placeholder="MM/DD/YYYY"
        placeholderTextColor="#e0e0e0"
        value={birthDate}
        onChangeText={handleBirthDateChange}
        keyboardType="numeric"
        maxLength={10}
      />
      <Text style={styles.helperText}>Enter your birth date in MM/DD/YYYY format</Text>
      <TouchableOpacity style={styles.button} onPress={handleNextStep}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepEight = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>What's your gender?</Text>
      {['Woman', 'Man', 'More'].map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.genderButton, gender === option && styles.selectedGenderButton]}
          onPress={() => setGender(option)}
        >
          <Text style={styles.buttonText}>{option}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.button} onPress={() => setStep(9)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepNine = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>What's your sexual orientation?</Text>
      {['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Questioning'].map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.orientationButton, sexualOrientation === option && styles.selectedOrientationButton]}
          onPress={() => setSexualOrientation(option)}
        >
          <Text style={styles.buttonText}>{option}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.button} onPress={() => setStep(10)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepTen = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Who are you interested in seeing?</Text>
      {['Woman', 'Man', 'Everyone'].map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.interestButton,
            interestedIn.includes(option) && styles.selectedInterestButton
          ]}
          onPress={() => {
            if (interestedIn.includes(option)) {
              setInterestedIn(interestedIn.filter(item => item !== option));
            } else {
              setInterestedIn([...interestedIn, option]);
            }
          }}
        >
          <Text style={styles.buttonText}>{option}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity 
        style={[styles.button, interestedIn.length === 0 && styles.disabledButton]} 
        onPress={() => setStep(11)}
        disabled={interestedIn.length === 0}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepEleven = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Maximum distance</Text>
      <Slider
        style={{width: '100%', height: 40}}
        minimumValue={1}
        maximumValue={100}
        step={1}
        value={maxDistance}
        onValueChange={(value) => setMaxDistance(value)}
        minimumTrackTintColor="#2f4f4f"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#2f4f4f"
      />
      <Text style={styles.distanceText}>{Math.round(maxDistance)} miles</Text>
      <TouchableOpacity style={styles.button} onPress={() => setStep(12)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepTwelve = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>What school do you go to? (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="School"
        placeholderTextColor="#e0e0e0"
        value={school}
        onChangeText={setSchool}
      />
      <TouchableOpacity style={styles.button} onPress={() => setStep(13)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepThirteen = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Lifestyle habits (Optional)</Text>
      {/* Add options for lifestyle habits */}
      <TouchableOpacity style={styles.button} onPress={() => setStep(14)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepFourteen = () => (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.title}>Hobbies (Optional)</Text>
      
      <TouchableOpacity style={styles.button} onPress={() => setStep(15)}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
  
  const renderStepFifteen = () => {
  
    const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    };
  
    const uploadImage = async (uri) => {
      setUploading(true);
      try {
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const userId = auth().currentUser.uid;
        const reference = storage().ref(`profilePictures/${userId}/${filename}`);
  
        await reference.putFile(uri);
        const downloadURL = await reference.getDownloadURL();
  
        setPictures([...pictures, downloadURL]);
      } catch (error) {
        console.error("Error uploading image: ", error);
        Alert.alert("Error", "An error occurred while uploading the image.");
      } finally {
        setUploading(false);
      }
    };
  
    return (
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.title}>Add at least 2 pictures</Text>
        <View style={styles.imageContainer}>
          {pictures.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.image} />
          ))}
          {pictures.length < 6 && (
            <TouchableOpacity 
              style={styles.addImageButton} 
              onPress={pickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.addImageButtonText}>+</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.button, pictures.length < 2 && styles.disabledButton]} 
          onPress={handleSignUp}
          disabled={pictures.length < 2 || uploading}
        >
          <Text style={styles.buttonText}>Finish Sign Up</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStepOne();
      case 2: return renderStepTwo();
      case 3: return renderStepThree();
      case 4: return renderStepFour();
      case 6: return renderStepSix(); 
      case 7: return renderStepSeven();
      case 8: return renderStepEight();
      case 9: return renderStepNine();
      case 10: return renderStepTen();
      case 11: return renderStepEleven();
      case 12: return renderStepTwelve();
      case 13: return renderStepThirteen();
      case 14: return renderStepFourteen();
      case 15: return renderStepFifteen();

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
  helperText: {
    color: '#e0e0e0',
    fontSize: 14,
    marginBottom: 20,
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
  selectedInterestButton: {
    backgroundColor: '#4f7f7f',
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
  orientationButton: {
    backgroundColor: '#2f4f4f',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedOrientationButton: {
    backgroundColor: '#4f7f7f',
  },
  distanceText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 10,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#2f4f4f',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 10,
  },
  addImageButtonText: {
    color: 'white',
    fontSize: 40,
  },
  disabledButton: {
    backgroundColor: '#555',
  },

});
