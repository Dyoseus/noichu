// CustomHeader.js
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function CustomHeader() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50, // Adjust the height as needed
    backgroundColor:'#232323',
  },
});
