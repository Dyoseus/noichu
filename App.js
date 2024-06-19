import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import SearchScreen from './screens/SearchScreen';
import FriendsListScreen from './screens/FriendsListScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import HomeScreen from './screens/HomeScreen';
import MessageScreen from './screens/MessageScreen';

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
  return (
    <TopTab.Navigator>
      <TopTab.Screen name="SearchTab" component={SearchScreen} />
      <TopTab.Screen name="My Friends" component={FriendsListScreen} />
      <TopTab.Screen name="Requests" component={FriendRequestsScreen} />
    </TopTab.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Friends" component={SearchTabNavigator} />
      <Tab.Screen name="Noichu" component={HomeScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
