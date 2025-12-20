import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import {
  searchUsers,
  sendFriendRequest,
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  removeFriend,
  Friend,
  UserProfile,
} from '../../services/friendsService';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadPendingRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    const { data } = await getFriends(user.id);
    setFriends(data || []);
  };

  const loadPendingRequests = async () => {
    if (!user) return;
    const { data } = await getPendingRequests(user.id);
    setPendingRequests(data || []);
  };

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const { data, error } = await searchUsers(searchQuery, user.id);
    if (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', error.message || 'Failed to search users. Make sure you have run the database migration.');
    }
    setSearchResults(data || []);
    setLoading(false);
  };

  const handleSendRequest = async (friendId: string) => {
    if (!user) return;

    const { error } = await sendFriendRequest(user.id, friendId);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } else {
      Alert.alert('Success', 'Friend request sent!');
      handleSearch(); // Refresh search
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const { error } = await acceptFriendRequest(friendshipId);
    if (error) {
      Alert.alert('Error', 'Failed to accept request');
    } else {
      loadFriends();
      loadPendingRequests();
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFriend(friendshipId);
          loadFriends();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FRIENDS</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            FRIENDS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            SEARCH
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            REQUESTS
            {pendingRequests.length > 0 && (
              <Text style={styles.badge}> {pendingRequests.length}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'search' && (
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.8}>
              <Text style={styles.searchButtonText}>SEARCH</Text>
            </TouchableOpacity>

            {loading && <Text style={styles.loadingText}>Searching...</Text>}

            {searchResults.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultUsername}>{result.username.toUpperCase()}</Text>
                  <Text style={styles.resultEmail}>{result.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleSendRequest(result.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addButtonText}>+ ADD</Text>
                </TouchableOpacity>
              </View>
            ))}

            {searchQuery && searchResults.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Make sure users have set their username in their profile
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'friends' && (
          <View>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>Search for users to add friends</Text>
              </View>
            ) : (
              friends.map((friend) => {
                const friendId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
                return (
                  <View key={friend.id} style={styles.friendCard}>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendUsername}>
                        {friend.friend_username || 'Friend'}
                      </Text>
                      <Text style={styles.friendEmail}>{friend.friend_email || ''}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveFriend(friend.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'requests' && (
          <View>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📬</Text>
                <Text style={styles.emptyText}>No pending requests</Text>
              </View>
            ) : (
              pendingRequests.map((request) => {
                const requester = request.requester as any;
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestUsername}>
                        {requester?.username?.toUpperCase() || requester?.email?.split('@')[0]?.toUpperCase() || 'USER'}
                      </Text>
                      <Text style={styles.requestEmail}>
                        {requester?.email || ''}
                      </Text>
                    </View>
                    <View style={styles.requestButtons}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptRequest(request.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.acceptButtonText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.accent1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: Colors.accent1,
    fontWeight: '900',
  },
  badge: {
    color: Colors.primary,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
    marginBottom: 20,
  },
  searchButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loadingText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  resultCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultUsername: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  resultEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  addButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  friendCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  friendEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  removeButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  requestCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  requestEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  acceptButtonText: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});

