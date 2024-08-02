import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Modal, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Slider from '@react-native-community/slider';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    firstName: '',
    phoneNumber: '',
    email: '',
    birthDate: '',
    gender: '',
    sexualOrientation: '',
    interestedIn: [],
    maxDistance: 0,
    school: '',
    lifestyleHabits: [],
    hobbies: [],
    pictures: [],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pictures, setPictures] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const user = auth().currentUser;
      if (user) {
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setUserData(data);
          setPictures(data.pictures || []);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleAddImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uploadResult = await uploadImage(result.assets[0].uri);
      if (uploadResult) {
        const newPictures = [...pictures, uploadResult];
        setPictures(newPictures);
        // Update user data in Firestore
        await firestore().collection('users').doc(auth().currentUser.uid).update({
          pictures: newPictures,
        });
      }
    }
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `${Date.now()}.jpg`;
    const userId = auth().currentUser.uid;
    const ref = storage().ref().child(`profilePictures/${userId}/${filename}`);

    try {
      await ref.put(blob);
      const url = await ref.getDownloadURL();
      return url;
    } catch (error) {
      console.error("Error uploading image: ", error);
      return null;
    }
  };

  const handleDeleteImage = async (index) => {
    const imageToDelete = pictures[index];
    const newPictures = pictures.filter((_, i) => i !== index);
    setPictures(newPictures);

    // Delete image from storage
    const userId = auth().currentUser.uid;
    const imageName = imageToDelete.split('%2F').pop().split('?')[0];
    const imageRef = storage().ref().child(`profilePictures/${userId}/${imageName}`);
    try {
      await imageRef.delete();
    } catch (error) {
      console.error("Error deleting image from storage: ", error);
    }

    // Update user data in Firestore
    await firestore().collection('users').doc(userId).update({
      pictures: newPictures,
    });
  };


  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.navigate('Welcome');
    } catch (error) {
      alert(error.message);
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
      await firestore().collection('users').doc(auth().currentUser.uid).update({
        email: updatedProfile.email,
        gender: updatedProfile.gender,
        sexualOrientation: updatedProfile.sexualOrientation,
        school: updatedProfile.school,
        hobbies: updatedProfile.hobbies,
        lifestyleHabits: updatedProfile.lifestyleHabits,
        interestedIn: updatedProfile.interestedIn,
        maxDistance: updatedProfile.maxDistance,
      });
      setUserData(prevData => ({
        ...prevData,
        ...updatedProfile
      }));
      setModalVisible(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const renderImageGrid = () => {
    const imageSlots = Array(6).fill(null);
    pictures.forEach((pic, index) => {
      imageSlots[index] = pic;
    });

    return (
      <View style={styles.imageGrid}>
        {imageSlots.map((pic, index) => (
          <View key={index} style={styles.imageContainer}>
            {pic ? (
              <>
                <Image source={{ uri: pic }} style={styles.profileImage} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteImage(index)}
                >
                  <FontAwesome name="times" size={20} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              index === pictures.length && pictures.length < 6 && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddImage}>
                  <FontAwesome name="plus" size={40} color="#2f4f4f" />
                </TouchableOpacity>
              )
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.firstName}>{userData.firstName ? `Welcome, ${userData.firstName}` : 'Welcome'}</Text>
        
        {renderImageGrid()}


        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

        <Pressable style={styles.editProfileButton} onPress={openEditModal}>
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </Pressable>

        <View>
          <Text style={styles.infoTitle}>Personal Information</Text>
          <Text>Name: {userData.firstName || 'Not set'}</Text>
          <Text>Phone: {userData.phoneNumber || 'Not set'}</Text>
          <Text>Email: {userData.email || 'Not set'}</Text>
          <Text>Birth Date: {userData.birthDate || 'Not set'}</Text>
          <Text>Gender: {userData.gender || 'Not set'}</Text>
          <Text>Sexual Orientation: {userData.sexualOrientation || 'Not set'}</Text>
          <Text>School: {userData.school || 'Not set'}</Text>
          <Text>Hobbies: {userData.hobbies ? userData.hobbies.join(', ') : 'Not set'}</Text>
          <Text>Lifestyle Habits: {userData.lifestyleHabits ? userData.lifestyleHabits.join(', ') : 'Not set'}</Text>

          <Text style={styles.infoTitle}>Preferences</Text>
          <Text>Interested In: {Array.isArray(userData.interestedIn) && userData.interestedIn.length > 0 ? userData.interestedIn.join(', ') : 'Not set'}</Text>
          <Text>Preferred Distance: {userData.maxDistance ? `${userData.maxDistance} miles` : 'Not set'}</Text>
        </View>

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
                userData={{
                  firstName: userData.firstName || '',
                  gender: userData.gender || '',
                  phoneNumber: userData.phoneNumber || '',
                  age: userData.age || '',
                  sexualOrientation: userData.sexualOrientation || '',
                  hobbies: userData.hobbies || [],
                  meet: userData.meet || [],
                  find: userData.find || [],
                  ageRange: userData.ageRange || { min: '', max: '' },
                  location: userData.location || '',
                  locationRadius: userData.locationRadius || '',
                }}
                onCancel={closeEditModal}
                onSave={saveProfile}
              />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const EditProfileForm = ({ userData, onCancel, onSave }) => {
  const [newEmail, setNewEmail] = useState(userData.email || '');
  const [newGender, setNewGender] = useState(userData.gender || '');
  const [newSexualOrientation, setNewSexualOrientation] = useState(userData.sexualOrientation || '');
  const [newSchool, setNewSchool] = useState(userData.school || '');
  const [newHobbies, setNewHobbies] = useState(userData.hobbies ? userData.hobbies.join(', ') : '');
  const [newLifestyleHabits, setNewLifestyleHabits] = useState(userData.lifestyleHabits ? userData.lifestyleHabits.join(', ') : '');
  const [newInterestedIn, setNewInterestedIn] = useState(userData.interestedIn ? userData.interestedIn.join(', ') : '');
  const [newMaxDistance, setNewMaxDistance] = useState(userData.maxDistance || 50);

  const handleSave = () => {
    onSave({
      email: newEmail,
      gender: newGender,
      sexualOrientation: newSexualOrientation,
      school: newSchool,
      hobbies: newHobbies.split(',').map(item => item.trim()),
      lifestyleHabits: newLifestyleHabits.split(',').map(item => item.trim()),
      interestedIn: newInterestedIn.split(',').map(item => item.trim()),
      maxDistance: newMaxDistance,
    });
  };

  return (
    <View style={styles.editProfileForm}>
      <Text>Email</Text>
      <TextInput
        style={styles.input}
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="Enter email"
        keyboardType="email-address"
      />

      <Text>Gender</Text>
      <TextInput
        style={styles.input}
        value={newGender}
        onChangeText={setNewGender}
        placeholder="Enter gender"
      />

      <Text>Sexual Orientation</Text>
      <TextInput
        style={styles.input}
        value={newSexualOrientation}
        onChangeText={setNewSexualOrientation}
        placeholder="Enter sexual orientation"
      />

      <Text>School</Text>
      <TextInput
        style={styles.input}
        value={newSchool}
        onChangeText={setNewSchool}
        placeholder="Enter school"
      />

      <Text>Hobbies (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={newHobbies}
        onChangeText={setNewHobbies}
        placeholder="Enter hobbies"
      />

      <Text>Lifestyle Habits (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={newLifestyleHabits}
        onChangeText={setNewLifestyleHabits}
        placeholder="Enter lifestyle habits"
      />

      <Text>Interested In (comma separated)</Text>
      <TextInput
        style={styles.input}
        value={newInterestedIn}
        onChangeText={setNewInterestedIn}
        placeholder="Enter interests"
      />

      <Text>Maximum Distance (miles)</Text>
      <Slider
        style={{width: '100%', height: 40}}
        minimumValue={1}
        maximumValue={100}
        step={1}
        value={newMaxDistance}
        onValueChange={(value) => setNewMaxDistance(value)}
        minimumTrackTintColor="#2f4f4f"
        maximumTrackTintColor="#d3d3d3"
        thumbTintColor="#2f4f4f"
      />
      <Text>{Math.round(newMaxDistance)} miles</Text>

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
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  imageContainer: {
    width: '32%',
    aspectRatio: 1,
    marginBottom: 10,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  addButton: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2f4f4f',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

