import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MessageScreen() {
  // Replace with dynamic message content
  const messages = ['Message1', 'Message2', 'Message3'];

  return (
    <View style={styles.container}>
      {messages.map((message, index) => (
        <Text key={index} style={styles.message}>
          {message}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    fontSize: 18,
    marginVertical: 8,
  },
});
