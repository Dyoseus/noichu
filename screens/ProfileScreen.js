import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { app } from '../firebaseConfig';

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export default function ProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
          setProfilePic(userDoc.data().profilePic);
        }
      }
    };
  
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Auth');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSelectImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.cancelled) {
        console.log("Image picker was cancelled");
        return;  // Early return if the picker is cancelled
    }

    if (!result.uri) {
        console.error("No image URI available");
        alert("No image URI available");
        return;  // Early return if no URI is found
    }

    setUploading(true);
    const imageUri = result.uri;
    const fileName = imageUri.split('/').pop();

    // Check if fileName is defined
    if (!fileName) {
        console.error("File name could not be determined");
        alert('File name could not be determined');
        setUploading(false);
        return;
    }

    const fileExtension = fileName.split('.').pop();
    // Check if fileExtension is defined
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



  return (
    <SafeAreaView style={styles.container}>
      {profilePic ? (
        <Image source={{ uri: profilePic }} style={styles.profileImage} />
      ) : (
        <Pressable style={styles.imagePlaceholder} onPress={handleSelectImage}>
          <Text style={styles.imagePlaceholderText}>Select Image</Text>
        </Pressable>
      )}
      <Text style={styles.username}>{username ? `Welcome, ${username}` : 'Loading...'}</Text>
      {uploading && <Text>Uploading...</Text>}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  username: {
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
  },
  logoutButtonText: {
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
});
