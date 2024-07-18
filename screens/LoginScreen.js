import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import countryCodes from '../constants/countryCodes'; // Make sure this path is correct

const CountryCodeSelector = ({ visible, onClose, onSelect, searchQuery, setSearchQuery }) => {
  const filteredCountryCodes = countryCodes.filter(country => 
    country.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.value.includes(searchQuery)
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
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
                  onClose();
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

export default function LoginScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendVerificationCode = async () => {
    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const confirmation = await auth().signInWithPhoneNumber(fullPhoneNumber);
      setConfirm(confirmation);
      setStep(2);
    } catch (error) {
      console.log('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      await confirm.confirm(verificationCode);
      navigation.navigate('App');
    } catch (error) {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Image source={require('../assets/arrow.png')} style={styles.backButtonImage} />
      </TouchableOpacity>
      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <Text style={styles.title}>Enter your phone number</Text>
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
        </ScrollView>
      ) : (
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
            <Text style={styles.buttonText}>Verify and Log In</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.buttonText}>New? Sign Up</Text>
      </TouchableOpacity>
      <CountryCodeSelector
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(code) => setCountryCode(code)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </SafeAreaView>
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
  signUpButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
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
