import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import SearchScreen from './screens/SearchScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import HomeScreen from './screens/HomeScreen';
import MessageScreen from './screens/MessageScreen';
import ChatScreen from './screens/ChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function SearchTabNavigator() {
  const [refresh, setRefresh] = useState(false);

  const handleFriendAccepted = () => {
    setRefresh(!refresh); // Toggle refresh state
  };

  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold', padding: 0 },
        tabBarStyle: { backgroundColor: '#f5E7B2' },
        tabBarIndicatorStyle: { backgroundColor: '#ff4444', height: 0 },
        tabBarActiveTintColor: '#ff4444',
        tabBarInactiveTintColor: '#333',
        tabBarItemStyle: {
          borderRadius: 15, 
          marginVertical: 5, 
          marginHorizontal: 5,
          backgroundColor: '#fff',
        },
      }}
    >
      <TopTab.Screen name="Search" component={SearchScreen} />
      <TopTab.Screen name="MyFriends">
        {() => <FriendsListScreen refresh={refresh} />}
      </TopTab.Screen>
      <TopTab.Screen name="Requests">
        {() => <FriendRequestsScreen onFriendAccepted={handleFriendAccepted} />}
      </TopTab.Screen>
    </TopTab.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ff4444',
        tabBarInactiveTintColor: '#333',
        tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#f5E7B2' },
      }}
    >
      <Tab.Screen name="Friends" component={SearchTabNavigator} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessageScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
        <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
