import React, { useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import SearchScreen from './SearchScreen';
import FriendsListScreen from './FriendsListScreen';
import FriendRequestsScreen from './FriendRequestsScreen';

const TopTab = createMaterialTopTabNavigator();

export default function SearchTab() {
  const [refresh, setRefresh] = useState(false);

  const handleFriendAccepted = () => {
    setRefresh(!refresh); // Toggle refresh state
  };

  return (
    <TopTab.Navigator>
      <TopTab.Screen name="Search" component={SearchScreen} />
      <TopTab.Screen name="Friends">
        {() => <FriendsListScreen refresh={refresh} />}
      </TopTab.Screen>
      <TopTab.Screen name="Requests">
        {() => <FriendRequestsScreen onFriendAccepted={handleFriendAccepted} />}
      </TopTab.Screen>
    </TopTab.Navigator>
  );
}
