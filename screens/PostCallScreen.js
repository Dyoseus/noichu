import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function PostCallScreen() {
  const navigation = useNavigation();

  const handleGoBack = () => {
    // navigates to video tab
    navigation.navigate('Video'); 
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.message}>The call has ended.</Text>
        <Pressable
          style={[styles.button, styles.goBackButton]}
          onPress={handleGoBack}
        >
          <Text style={styles.buttonText}>Go Back to Call Screen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#232323',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  message: {
    color: 'white',
    fontSize: 20,
    marginBottom: 20,
  },
  button: {
    width: '90%',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  goBackButton: {
    backgroundColor: 'blue',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
});