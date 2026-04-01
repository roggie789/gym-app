import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, UserPlus, Swords, X, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import { supabase } from '../../config/supabase';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  Friend,
  UserProfile,
} from '../../services/friendsService';
import { useFriends, usePendingFriendRequests, useInvalidate } from '../../hooks/useQueryHooks';
import CreateChallengeModal from '../../components/CreateChallengeModal';

interface FriendsScreenProps {
  onViewProfile?: (userId: string, username: string) => void;
  onClose?: () => void;
}

interface FriendStats {
  level: number;
  level_xp: number;
  total_workouts: number;
  total_prs: number;
  current_streak: number;
  longest_streak: number;
  challenges_won: number;
}

export default function FriendsScreen({ onViewProfile, onClose }: FriendsScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const invalidate = useInvalidate();
  const { data: friends = [], isLoading: loading } = useFriends();
  const { data: pendingRequests = [] } = usePendingFriendRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'requests'>('friends');
  const [searchLoading, setSearchLoading] = useState(false);

  // Friend profile modal state
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedFriendStats, setSelectedFriendStats] = useState<FriendStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Challenge modal state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeFriendId, setChallengeFriendId] = useState('');
  const [challengeFriendUsername, setChallengeFriendUsername] = useState('');

  // Debounced search - fires 400ms after user stops typing
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      if (!user) return;
      const { data, error } = await searchUsers(query, user.id);
      if (error) {
        showAlert({ title: 'Error', message: error.message || 'Failed to search users' });
      }
      setSearchResults(data || []);
      setSearchLoading(false);
    }, 400);
  }, [user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleSendRequest = async (friendId: string) => {
    if (!user) return;
    const { error } = await sendFriendRequest(user.id, friendId);
    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to send request' });
    } else {
      showAlert({ title: 'Success', message: 'Friend request sent!' });
      debouncedSearch(searchQuery);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    const { error } = await acceptFriendRequest(friendshipId);
    if (error) {
      showAlert({ title: 'Error', message: 'Failed to accept request' });
    } else {
      invalidate.friends();
      invalidate.pendingRequests();
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    showAlert({
      title: 'Remove Friend',
      message: `Remove ${friendName} from your friends?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFriend(friendshipId);
            invalidate.friends();
            if (showProfileModal) {
              setShowProfileModal(false);
              setSelectedFriend(null);
            }
          },
        },
      ],
    });
  };

  const openFriendProfile = async (friend: Friend) => {
    setSelectedFriend(friend);
    setShowProfileModal(true);
    setLoadingStats(true);

    const friendId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;

    try {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('level, level_xp, total_workouts, total_prs, current_streak, longest_streak, challenges_won')
        .eq('user_id', friendId)
        .single();

      if (stats) {
        setSelectedFriendStats({
          level: stats.level || 1,
          level_xp: stats.level_xp || 0,
          total_workouts: stats.total_workouts || 0,
          total_prs: stats.total_prs || 0,
          current_streak: stats.current_streak || 0,
          longest_streak: stats.longest_streak || 0,
          challenges_won: stats.challenges_won || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load friend stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleChallengeFriend = (friendId: string, friendUsername: string) => {
    setChallengeFriendId(friendId);
    setChallengeFriendUsername(friendUsername);
    setShowProfileModal(false);
    setShowChallengeModal(true);
  };

  const getFriendId = (friend: Friend) =>
    friend.user_id === user?.id ? friend.friend_id : friend.user_id;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
            <ChevronLeft size={18} color={Colors.textPrimary} strokeWidth={2.5} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>FRIENDS</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            FRIENDS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            ADD FRIEND
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            REQUESTS{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.emptyText}>Loading friends...</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>
                  Search for users by username to add friends
                </Text>
              </View>
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendCard}
                  onPress={() => openFriendProfile(friend)}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>
                      {friend.friend_username || 'Friend'}
                    </Text>
                    <Text style={styles.friendLevel}>
                      Level {friend.friend_level || 1}
                    </Text>
                  </View>
                  <View style={styles.friendChevron}>
                    <ChevronLeft
                      size={16}
                      color={Colors.textMuted}
                      strokeWidth={2}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* Add Friend Tab */}
        {activeTab === 'add' && (
          <>
            <View style={styles.searchInputContainer}>
              <Search size={16} color={Colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {searchLoading && (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}

            {searchResults.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{result.username}</Text>
                  <Text style={styles.resultEmail}>{result.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleSendRequest(result.id)}
                  activeOpacity={0.7}
                >
                  <UserPlus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}

            {!searchQuery && !searchLoading && searchResults.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Search for friends</Text>
                <Text style={styles.emptySubtext}>
                  Start typing a username to find users
                </Text>
              </View>
            )}

            {searchQuery && searchResults.length === 0 && !searchLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different username
                </Text>
              </View>
            )}
          </>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📬</Text>
                <Text style={styles.emptyText}>No pending requests</Text>
                <Text style={styles.emptySubtext}>
                  Friend requests you receive will appear here
                </Text>
              </View>
            ) : (
              pendingRequests.map((request) => {
                const requester = request.requester as any;
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>
                        {requester?.username || requester?.email?.split('@')[0] || 'User'}
                      </Text>
                      <Text style={styles.requestSubtext}>Wants to be your friend</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptRequest(request.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Friend Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedFriend?.friend_username || 'Friend'}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowProfileModal(false);
                  setSelectedFriend(null);
                  setSelectedFriendStats(null);
                }}
                activeOpacity={0.7}
              >
                <X size={16} color={Colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {loadingStats ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Level Badge */}
                <View style={styles.profileLevelRow}>
                  <View style={styles.profileLevelBadge}>
                    <Text style={styles.profileLevelNumber}>
                      {selectedFriendStats?.level || selectedFriend?.friend_level || 1}
                    </Text>
                  </View>
                  <View style={styles.profileLevelInfo}>
                    <Text style={styles.profileLevelLabel}>LEVEL</Text>
                    <Text style={styles.profileXPText}>
                      {(selectedFriendStats?.level_xp || 0).toLocaleString()} XP
                    </Text>
                  </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>WORKOUTS</Text>
                    <Text style={styles.statValue}>{selectedFriendStats?.total_workouts || 0}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>TOTAL PRS</Text>
                    <Text style={styles.statValue}>{selectedFriendStats?.total_prs || 0}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>STREAK</Text>
                    <Text style={styles.statValue}>{selectedFriendStats?.current_streak || 0}d</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>BEST STREAK</Text>
                    <Text style={styles.statValue}>{selectedFriendStats?.longest_streak || 0}d</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>WINS</Text>
                    <Text style={styles.statValue}>{selectedFriendStats?.challenges_won || 0}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={styles.challengeActionButton}
                    onPress={() => {
                      if (selectedFriend) {
                        handleChallengeFriend(
                          getFriendId(selectedFriend),
                          selectedFriend.friend_username || ''
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Swords size={18} color={Colors.textPrimary} strokeWidth={2.5} />
                    <Text style={styles.challengeActionText}>Challenge to Lift Off</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeActionButton}
                    onPress={() => {
                      if (selectedFriend) {
                        handleRemoveFriend(
                          selectedFriend.id,
                          selectedFriend.friend_username || 'this friend'
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={Colors.danger} strokeWidth={2.5} />
                    <Text style={styles.removeActionText}>Remove Friend</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Challenge Modal */}
      <CreateChallengeModal
        visible={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          setChallengeFriendId('');
          setChallengeFriendUsername('');
        }}
        challengedUserId={challengeFriendId}
        challengedUsername={challengeFriendUsername}
        onChallengeCreated={() => {
          showAlert({ title: 'Success', message: 'Challenge sent!' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.backgroundCard,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Friends list
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  friendLevel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  friendChevron: {
    width: 28,
    alignItems: 'center',
  },

  // Search
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  resultEmail: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Requests
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  requestSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.success,
  },
  acceptButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Friend Profile Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    maxHeight: '75%',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Profile in modal
  profileLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  profileLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLevelNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  profileLevelInfo: {
    gap: 2,
  },
  profileLevelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  profileXPText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  // Profile action buttons
  profileActions: {
    gap: 10,
    marginBottom: 20,
  },
  challengeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  challengeActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  removeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
});
