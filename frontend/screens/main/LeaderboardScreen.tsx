import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import {
  getUserGroups,
  getPublicGroups,
  createGroup,
  joinPublicGroup,
  requestToJoinGroup,
  Group,
} from '../../services/groupsService';

type TabType = 'my' | 'discover';

interface LeaderboardScreenProps {
  onSelectLeaderboard?: (groupId: string | 'global', groupData?: Group) => void;
}

export default function LeaderboardScreen({ onSelectLeaderboard }: LeaderboardScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (user) {
      loadMyGroups();
      if (activeTab === 'discover') {
        loadPublicGroups();
      }
    }
  }, [user, activeTab]);

  const loadMyGroups = async () => {
    if (!user) return;
    const { data } = await getUserGroups(user.id);
    const formattedGroups = (data || []).map((item: any) => ({
      ...item.group,
      user_role: item.role,
    }));
    setMyGroups(formattedGroups);
  };

  const loadPublicGroups = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await getPublicGroups(user.id);
    setPublicGroups(data || []);
    setLoading(false);
  };

  const handleSelectLeaderboard = (groupId: string | 'global') => {
    if (groupId === 'global') {
      onSelectLeaderboard?.('global');
    } else {
      const groupData = myGroups.find(g => g.id === groupId);
      onSelectLeaderboard?.(groupId, groupData);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    const { data, error } = await createGroup(newGroupName.trim(), newGroupDescription.trim(), user.id, isPublic);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to create group');
      return;
    }

    Alert.alert('Success', 'Group created successfully!');
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setIsPublic(true);
    loadMyGroups();
    if (data) {
      // Navigate to the newly created leaderboard
      onSelectLeaderboard?.(data.id, data);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await joinPublicGroup(groupId, user.id);
    setLoading(false);

    if (error) {
      // If it's a private group, try requesting to join
      if (error.message?.includes('private')) {
        const { data: requestData, error: requestError } = await requestToJoinGroup(groupId, user.id);
        if (requestError) {
          Alert.alert('Error', requestError.message || 'Failed to request to join');
        } else {
          Alert.alert('Request Sent', 'Your request to join has been sent to the group owner');
          loadPublicGroups();
        }
      } else {
        Alert.alert('Error', error.message || 'Failed to join group');
      }
      return;
    }

    Alert.alert('Success', 'Joined group successfully!');
    loadMyGroups();
    loadPublicGroups();
    setActiveTab('my');
    // Navigate to the joined leaderboard
    const groupData = publicGroups.find(g => g.id === groupId);
    onSelectLeaderboard?.(groupId, groupData);
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARDS</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.headerButtonText}>CREATE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { marginLeft: 12 }]}
            onPress={() => {
              setActiveTab('discover');
              loadPublicGroups();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.headerButtonText}>JOIN</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            MY LEADERBOARDS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => {
            setActiveTab('discover');
            loadPublicGroups();
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            DISCOVER
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my' ? (
        <>
          <View style={styles.groupSelectorContainer}>
            <Text style={styles.groupSelectorTitle}>SELECT LEADERBOARD</Text>
            <ScrollView 
              style={styles.groupSelector}
              contentContainerStyle={styles.groupSelectorContent}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.groupChip}
                onPress={() => handleSelectLeaderboard('global')}
                activeOpacity={0.8}
              >
                <Text style={styles.groupChipText}>
                  GLOBAL
                </Text>
              </TouchableOpacity>
              {myGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.groupChip}
                  onPress={() => handleSelectLeaderboard(group.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.groupChipText}>
                    {group.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>Select a leaderboard to view</Text>
            <Text style={styles.emptySubtext}>
              Choose a leaderboard from the list above to see rankings
            </Text>
          </View>
        </>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : publicGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No public groups found</Text>
              <Text style={styles.emptySubtext}>Create your own group to get started!</Text>
            </View>
          ) : (
            publicGroups.map((group) => (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupCardHeader}>
                  <View style={styles.groupCardInfo}>
                    <Text style={styles.groupCardName}>{group.name.toUpperCase()}</Text>
                    {group.description && (
                      <Text style={styles.groupCardDescription}>{group.description}</Text>
                    )}
                    <View style={styles.groupCardMeta}>
                      <Text style={styles.groupCardMetaText}>
                        {group.member_count || 0} MEMBERS
                      </Text>
                      <Text style={[styles.groupCardMetaText, { marginLeft: 16 }]}>
                        {group.is_public ? 'PUBLIC' : 'PRIVATE'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinGroup(group.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.joinButtonText}>
                    {group.is_public ? 'JOIN' : 'REQUEST TO JOIN'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>CREATE LEADERBOARD</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Leaderboard Name"
              placeholderTextColor={Colors.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalSwitchContainer}>
              <Text style={styles.modalSwitchLabel}>PUBLIC LEADERBOARD</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={isPublic ? Colors.accent1 : Colors.textSecondary}
              />
            </View>
            <Text style={styles.modalSwitchHint}>
              {isPublic
                ? 'Anyone can join this leaderboard'
                : 'Users must request to join (requires approval)'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setIsPublic(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { marginLeft: 12 }]}
                onPress={handleCreateGroup}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.accent1,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  groupSelectorContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    maxHeight: 200,
  },
  groupSelectorTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  groupSelector: {
    flexGrow: 0,
  },
  groupSelectorContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  groupChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  groupChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupChipTextActive: {
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  ownerButtons: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 12,
  },
  requestsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.accent1,
    alignItems: 'center',
  },
  requestsButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  settingsButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.accent1,
    alignItems: 'center',
    marginLeft: 12,
  },
  settingsButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  leaderboardCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  leaderboardCardCurrent: {
    borderColor: Colors.accent1,
    backgroundColor: Colors.backgroundSecondary,
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  rankText: {
    fontSize: 20,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    flex: 1,
  },
  youLabel: {
    color: Colors.accent1,
    fontSize: 14,
  },
  points: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.xpGold,
    textShadowColor: Colors.xpGold,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  groupCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  groupCardHeader: {
    marginBottom: 16,
  },
  groupCardInfo: {
    marginBottom: 12,
  },
  groupCardName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  groupCardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  groupCardMeta: {
    flexDirection: 'row',
  },
  groupCardMetaText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  joinButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.accent1,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
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
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSwitchLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  modalSwitchHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 40,
  },
  modalButtonCancel: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF', // Explicit white for visibility
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  modalButtonTextConfirm: {
    color: Colors.textPrimary,
  },
  requestsList: {
    maxHeight: 400,
    marginBottom: 12,
  },
  requestsListContent: {
    paddingBottom: 0,
  },
  modalButtonContainer: {
    marginTop: 8,
    width: '100%',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  requestButtonApprove: {
    backgroundColor: Colors.success,
    borderColor: Colors.accent1,
  },
  requestButtonReject: {
    backgroundColor: Colors.danger,
    borderColor: Colors.accent1,
  },
  requestButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  settingsContent: {
    maxHeight: 500,
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.accent1,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  membersList: {
    maxHeight: 200,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  ownerBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.accent1,
    letterSpacing: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  removeMemberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  removeMemberButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
    borderColor: Colors.accent1,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
