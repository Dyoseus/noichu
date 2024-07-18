import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gender, setGender] = useState('');
  const [phone, setPhoneNumber] = useState('');
  const [meet, setMeet] = useState([]);
  const [find, setFind] = useState([]);
  const [ageRange, setAgeRange] = useState({ min: '', max: '' });
  const [location, setLocation] = useState('');
  const [locationRadius, setLocationRadius] = useState('');
  const [age, setAge] = useState(''); // Remove default value
  const [sexualOrientation, setSexualOrientation] = useState(''); // Remove default value
  const [hobbies, setHobbies] = useState([]); // Remove default value
  const [modalVisible, setModalVisible] = useState(false); // State to manage modal visibility

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      try{
      if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || '');
            setProfilePic(userData.profilePic || null);
            setGender(userData.gender || '');
            setPhoneNumber(userData.phone || '');
            setMeet(userData.meet || []);
            setFind(userData.find || []);
            setAgeRange(userData.ageRange || { min: '', max: '' });
            setLocation(userData.location || '');
            setLocationRadius(userData.locationRadius || '');
            setAge(userData.age || ''); // Apply default only if no value
            setSexualOrientation(userData.sexualOrientation || ''); // Apply default only if no value
            setHobbies(userData.hobbies || []); // Apply default only if no value
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.navigate('Auth');
      // Navigate to login screen or any other screen
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.2,
    });

    if (result.cancelled) {
      console.log("Image picker was cancelled");
      return;
    }

    if (!result.assets || result.assets.length === 0) {
      console.error("No image selected");
      alert("No image selected");
      return;
    }

    const imageUri = result.assets[0].uri;
    if (!imageUri) {
      console.error("No image URI available");
      alert("No image URI available");
      return;
    }

    setUploading(true);
    const fileName = imageUri.split('/').pop();

    if (!fileName) {
      console.error("File name could not be determined");
      alert('File name could not be determined');
      setUploading(false);
      return;
    }

    const fileExtension = fileName.split('.').pop();

    if (!fileExtension) {
      console.error("File extension could not be determined");
      alert('File extension could not be determined');
      setUploading(false);
      return;
    }

    const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}.${fileExtension}`);
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        profilePic: downloadURL,
      });
      setProfilePic(downloadURL);
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = () => {
    setModalVisible(true);
  };

  const closeEditModal = () => {
    setModalVisible(false);
  };

  const saveProfile = async (updatedProfile) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      setUsername(updatedProfile.username || '');
      setGender(updatedProfile.gender || '');
      setPhoneNumber(updatedProfile.phone || '');
      setMeet(updatedProfile.meet || []);
      setFind(updatedProfile.find || []);
      setAgeRange(updatedProfile.ageRange || { min: '', max: '' });
      setLocation(updatedProfile.location || '');
      setLocationRadius(updatedProfile.locationRadius || '');
      setAge(updatedProfile.age || '');
      setSexualOrientation(updatedProfile.sexualOrientation || '');
      setHobbies(updatedProfile.hobbies || []);
      setModalVisible(false);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Pressable onPress={handleSelectImage}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.profileImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Select Image</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.username}>{username ? `Welcome, ${username}` : 'Loading...'}</Text>
        {uploading && <Text>Uploading...</Text>}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

        <Pressable style={styles.editProfileButton} onPress={openEditModal}>
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </Pressable>

        {/* Modal for Edit Profile */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeEditModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ScrollView>
                <EditProfileForm
                  username={username}
                  gender={gender}
                  phone={phone}
                  age={age}
                  sexualOrientation={sexualOrientation}
                  hobbies={hobbies}
                  meet={meet}
                  find={find}
                  ageRange={ageRange}
                  location={location}
                  locationRadius={locationRadius}
                  onCancel={closeEditModal}
                  onSave={saveProfile}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View>
          {/* Personal Information Section */}
          <Text style={styles.infoTitle}>Personal Information</Text>
          <Text>Name: {username}</Text>
          <Text>Phone: {phone}</Text>
          <Text>Gender: {gender}</Text>
          <Text>Age: {age}</Text>
          <Text>Sexual Orientation: {sexualOrientation}</Text>
          <Text>Hobbies: {hobbies.join(', ')}</Text>
          <Text>Location: {location}</Text>

          {/* Preference Information */}
          <Text style={styles.infoTitle}>Preferences</Text>
          <Text>Meet: {meet.join(', ')}</Text>
          <Text>Find: {find.join(', ')}</Text>
          <Text>Age Range of Interests: {ageRange.min} - {ageRange.max}</Text>
          <Text>Location Radius: {locationRadius}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const EditProfileForm = ({
  username,
  gender,
  phone,
  age,
  sexualOrientation,
  hobbies,
  meet,
  find,
  ageRange,
  location,
  locationRadius,
  onCancel,
  onSave,
}) => {
  const [newUsername, setNewUsername] = useState(username);
  const [newGender, setNewGender] = useState(gender);
  const [newPhone, setNewPhone] = useState(phone);
  const [newAge, setNewAge] = useState(age);
  const [newSexualOrientation, setNewSexualOrientation] = useState(sexualOrientation);
  const [newHobbies, setNewHobbies] = useState(hobbies.join(', '));
  const [newMeet, setNewMeet] = useState(meet.join(', '));
  const [newFind, setNewFind] = useState(find.join(', '));
  const [newMinAge, setNewMinAge] = useState(ageRange.min);
  const [newMaxAge, setNewMaxAge] = useState(ageRange.max);
  const [newLocation, setNewLocation] = useState(location);
  const [newLocationRadius, setNewLocationRadius] = useState(locationRadius);

  const handleSave = () => {
    onSave({
      username: newUsername,
      gender: newGender,
      phone: newPhone,
      age: newAge,
      sexualOrientation: newSexualOrientation,
      hobbies: newHobbies.split(',').map(item => item.trim()),
      meet: newMeet.split(',').map(item => item.trim()),
      find: newFind.split(',').map(item => item.trim()),
      ageRange: { min: newMinAge, max: newMaxAge },
      location: newLocation,
      locationRadius: newLocationRadius,
    });
  };

  return (
    <View style={styles.editProfileForm}>
      <Text>Username</Text>
      <TextInput
        style={styles.input}
        value={newUsername}
        onChangeText={setNewUsername}
        placeholder="Enter username"
      />

      <Text>Gender</Text>
      <TextInput
        style={styles.input}
        value={newGender}
        onChangeText={setNewGender}
        placeholder="Enter gender"
      />

      <Text>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={newPhone}
        onChangeText={setNewPhone}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
      />

      <Text>Age</Text>
      <TextInput
        style={styles.input}
        value={newAge}
        onChangeText={setNewAge}
        placeholder="Enter age"
        keyboardType="numeric"
      />

      <Text>Sexual Orientation</Text>
      <TextInput
        style={styles.input}
        value={newSexualOrientation}
        onChangeText={setNewSexualOrientation}
        placeholder="Enter sexual orientation"
      />

      <Text>Hobbies</Text>
      <TextInput
        style={styles.input}
        value={newHobbies}
        onChangeText={setNewHobbies}
        placeholder="Enter hobbies"
      />

      <Text>Meet Preferences (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={newMeet}
        onChangeText={setNewMeet}
        placeholder="Enter meet preferences"
      />

      <Text>Find Preferences (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={newFind}
        onChangeText={setNewFind}
        placeholder="Enter find preferences"
      />

      <Text>Minimum Age</Text>
      <TextInput
        style={styles.input}
        value={newMinAge}
        onChangeText={setNewMinAge}
        placeholder="Enter minimum age"
        keyboardType="numeric"
      />

      <Text>Maximum Age</Text>
      <TextInput
        style={styles.input}
        value={newMaxAge}
        onChangeText={setNewMaxAge}
        placeholder="Enter maximum age"
        keyboardType="numeric"
      />

      <Text>Location</Text>
      <TextInput
        style={styles.input}
        value={newLocation}
        onChangeText={setNewLocation}
        placeholder="Enter location"
      />

      <Text>Location Radius</Text>
      <TextInput
        style={styles.input}
        value={newLocationRadius}
        onChangeText={setNewLocationRadius}
        placeholder="Enter location radius"
        keyboardType="numeric"
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  firstName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 20,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff4444',
    borderRadius: 4,
    marginTop: 10,
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#ccc',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePlaceholderText: {
    color: '#fff',
    fontSize: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  editProfileForm: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: '80%', // Limit the height of the modal content
  },
});

