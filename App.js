// App.js

import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import HomeScreen from './screens/HomeScreen';
import MessageScreen from './screens/MessageScreen';
import ChatScreen from './screens/ChatScreen';
import VideoCallScreen from './screens/VideoCallScreen';
import ProfileScreen from './screens/ProfileScreen';
import PostCallScreen from './screens/PostCallScreen';
import WelcomeScreen from './screens/WelcomeScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function SearchTabNavigator() {
  const [refreshFriends, setRefreshFriends] = useState(false);
  const [refreshRequests, setRefreshRequests] = useState(false);

  const handleFriendAccepted = () => {
    setRefreshFriends(!refreshFriends); 
  };

  const handleRequestReceived = () => {
    setRefreshRequests(!refreshRequests); 
  };

  const handleFriendRemoved = () => {
    setRefreshFriends(!refreshFriends); 
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#232323' }}>
      <TopTab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', padding: 0 },
          tabBarStyle: { backgroundColor: '#232323' },
          tabBarIndicatorStyle: { backgroundColor: '#ff4444', height: 0 },
          tabBarActiveTintColor: '#ff4444',
          tabBarInactiveTintColor: '#333',
          tabBarItemStyle: {
            borderRadius: 25, 
            marginVertical: 5, 
            marginHorizontal: 5,
            backgroundColor: '#fff',
          },
        }}
      >
        <TopTab.Screen name="My Friends">
          {() => <FriendsListScreen refresh={refreshFriends} onFriendRemoved={handleFriendRemoved} />}
        </TopTab.Screen>
        <TopTab.Screen name="Requests">
          {() => <FriendRequestsScreen refresh={refreshRequests} onFriendAccepted={handleFriendAccepted} />}
        </TopTab.Screen>
      </TopTab.Navigator>
    </SafeAreaView>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ff4444',
        tabBarInactiveTintColor: 'white',
        tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#2f4f4f' },
        headerShown: false,
      }}
    >
      <Tab.Screen name="Friends" component={SearchTabNavigator} />
      <Tab.Screen name="Video" component={VideoCallScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Messages" component={MessageScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="App" component={AppTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              ...TransitionPresets.ModalSlideFromBottomIOS,
            }}
          />
          <Stack.Screen
            name="PostCall"
            component={PostCallScreen}
            options={{ title: 'Post Call' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
