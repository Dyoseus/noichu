import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { app } from '../firebaseConfig';
import { ScrollView } from 'react-native-gesture-handler';

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const SECTIONS = [
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  },
  {
    header : 'Gender',
    items : 'Men'
  },
  {
    header : 'Age',
    items : 18
  }
];

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
      quality: 0.2,
    });

    if (result.canceled) {
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

  const editProfile = async () => {
    try {
      await alert("editProfile");
      navigation.navigate('Auth');
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

        {/* TODO: make this whole Profile Screen scrollable up and down, include each horizontal section for each customization of interests */}
        <Pressable style={styles.editProfileButton} onPress={editProfile}>
          <Text sylte={styles.editProfileButtonText}>Edit Profile</Text>
        </Pressable>

        {SECTIONS.map( ({header, items}) => (
          <View key={header}>
            <Text>{header}</Text>
          </View>
        ))}
      </ScrollView>
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
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff4444',
    borderRadius: 4,
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
});
