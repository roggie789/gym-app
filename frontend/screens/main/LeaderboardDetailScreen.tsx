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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { getGroupLeaderboard, getGlobalLeaderboard, LeaderboardEntry } from '../../services/leaderboardService';
import {
  getGroupJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateGroup,
  removeMemberFromGroup,
  deleteGroup,
  getGroupMembers,
  Group,
  GroupJoinRequest,
} from '../../services/groupsService';
import CreateChallengeModal from '../../components/CreateChallengeModal';

interface LeaderboardDetailScreenProps {
  groupId: string | 'global';
  groupData?: Group;
  onBack: () => void;
  onViewProfile?: (userId: string, username: string) => void;
}

export default function LeaderboardDetailScreen({ groupId, groupData, onBack, onViewProfile }: LeaderboardDetailScreenProps) {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<GroupJoinRequest[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUsername, setSelectedUsername] = useState<string>('');

  const isOwner = groupData && groupData.created_by === user?.id;
  const isGlobal = groupId === 'global';

  useEffect(() => {
    loadLeaderboard();
    if (isOwner && !isGlobal) {
      setEditGroupName(groupData?.name || '');
      setEditGroupDescription(groupData?.description || '');
    }
  }, [groupId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    if (groupId === 'global') {
      const { data } = await getGlobalLeaderboard(100);
      setLeaderboard(data || []);
    } else {
      const { data } = await getGroupLeaderboard(groupId);
      setLeaderboard(data || []);
    }
    setLoading(false);
  };

  const handleViewRequests = async () => {
    if (!groupId || groupId === 'global') return;
    const { data } = await getGroupJoinRequests(groupId);
    setPendingRequests(data || []);
    setShowRequestsModal(true);
  };

  const handleApproveRequest = async (requestId: string, userId: string) => {
    if (!user || !groupId || groupId === 'global') return;

    setLoading(true);
    const { error } = await approveJoinRequest(requestId, groupId, userId, user.id);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to approve request');
      return;
    }

    Alert.alert('Success', 'Request approved');
    const { data } = await getGroupJoinRequests(groupId);
    setPendingRequests(data || []);
    loadLeaderboard();
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!user) return;

    setLoading(true);
    const { error } = await rejectJoinRequest(requestId, user.id);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to reject request');
      return;
    }

    const { data } = await getGroupJoinRequests(groupId as string);
    setPendingRequests(data || []);
  };

  const handleOpenSettings = async () => {
    if (!groupId || groupId === 'global') return;
    
    setEditGroupName(groupData?.name || '');
    setEditGroupDescription(groupData?.description || '');
    setShowSettingsModal(true);

    const { data } = await getGroupMembers(groupId);
    setGroupMembers(data || []);
  };

  const handleUpdateGroup = async () => {
    if (!groupId || groupId === 'global' || !editGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    const { error } = await updateGroup(groupId, editGroupName.trim(), editGroupDescription.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to update group');
      return;
    }

    Alert.alert('Success', 'Group updated successfully!');
    setShowSettingsModal(false);
    onBack(); // Go back to refresh the list
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!groupId || groupId === 'global') return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this leaderboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await removeMemberFromGroup(groupId, memberId);
            setLoading(false);

            if (error) {
              Alert.alert('Error', error.message || 'Failed to remove member');
              return;
            }

            Alert.alert('Success', 'Member removed successfully');
            const { data } = await getGroupMembers(groupId);
            setGroupMembers(data || []);
            loadLeaderboard();
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async () => {
    if (!groupId || groupId === 'global') return;

    Alert.alert(
      'Delete Leaderboard',
      'Are you sure you want to delete this leaderboard? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await deleteGroup(groupId);
            setLoading(false);

            if (error) {
              Alert.alert('Error', error.message || 'Failed to delete group');
              return;
            }

            Alert.alert('Success', 'Leaderboard deleted successfully');
            onBack();
          },
        },
      ]
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return Colors.xpGold;
    if (rank === 2) return Colors.textSecondary;
    if (rank === 3) return Colors.warning;
    return Colors.textPrimary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupData?.name.toUpperCase() || 'GLOBAL'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isOwner && !isGlobal && (
        <View style={styles.ownerButtons}>
          <TouchableOpacity
            style={styles.requestsButton}
            onPress={handleViewRequests}
            activeOpacity={0.8}
          >
            <Text style={styles.requestsButtonText}>VIEW JOIN REQUESTS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleOpenSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsButtonText}>⚙ SETTINGS</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyText}>No rankings yet</Text>
            <Text style={styles.emptySubtext}>
              {isGlobal
                ? 'Start working out to appear on the leaderboard!'
                : 'No members in this group yet'}
            </Text>
          </View>
        ) : (
          leaderboard.map((entry) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <View
                key={entry.user_id}
                style={[
                  styles.leaderboardCard,
                  isCurrentUser && styles.leaderboardCardCurrent,
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={[styles.rankText, { color: getRankColor(entry.rank) }]}>
                    {getRankIcon(entry.rank)}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.username}>
                      {entry.username.toUpperCase()}
                      {isCurrentUser && <Text style={styles.youLabel}> (YOU)</Text>}
                    </Text>
                    <View style={styles.headerRight}>
                      <Text style={styles.points}>{entry.total_points.toLocaleString()} XP</Text>
                      {!isCurrentUser && (
                        <View style={styles.userActions}>
                          {onViewProfile && (
                            <TouchableOpacity
                              style={styles.viewProfileButton}
                              onPress={() => onViewProfile(entry.user_id, entry.username)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.viewProfileButtonText}>👤</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.challengeButton}
                            onPress={() => {
                              setSelectedUserId(entry.user_id);
                              setSelectedUsername(entry.username);
                              setShowChallengeModal(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.challengeButtonText}>⚔️</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>LEVEL</Text>
                      <Text style={styles.statValue}>{entry.level}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>STREAK</Text>
                      <Text style={styles.statValue}>{entry.current_streak}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>PRs</Text>
                      <Text style={styles.statValue}>{entry.total_prs}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>WORKOUTS</Text>
                      <Text style={styles.statValue}>{entry.total_workouts}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>WINS</Text>
                      <Text style={styles.statValue}>{entry.challenges_won || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Join Requests Modal */}
      <Modal
        visible={showRequestsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>JOIN REQUESTS</Text>
            <ScrollView 
              style={styles.requestsList}
              contentContainerStyle={styles.requestsListContent}
            >
              {pendingRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No pending requests</Text>
                </View>
              ) : (
                pendingRequests.map((request) => (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestUsername}>
                        {request.username?.toUpperCase() || 'USER'}
                      </Text>
                      <Text style={styles.requestDate}>
                        {new Date(request.requested_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.requestButtons}>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.requestButtonApprove]}
                        onPress={() => handleApproveRequest(request.id, request.user_id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.requestButtonText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.requestButton, styles.requestButtonReject, { marginLeft: 8 }]}
                        onPress={() => handleRejectRequest(request.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.requestButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowRequestsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonTextCancel}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>LEADERBOARD SETTINGS</Text>
            
            <ScrollView style={styles.settingsContent}>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>EDIT DETAILS</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Leaderboard Name"
                  placeholderTextColor={Colors.textMuted}
                  value={editGroupName}
                  onChangeText={setEditGroupName}
                />
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Description (optional)"
                  placeholderTextColor={Colors.textMuted}
                  value={editGroupDescription}
                  onChangeText={setEditGroupDescription}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleUpdateGroup}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>SAVE CHANGES</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>MEMBERS ({groupMembers.length})</Text>
                <ScrollView style={styles.membersList} nestedScrollEnabled>
                  {groupMembers.map((member) => {
                    const isOwnerMember = member.user_id === groupData?.created_by;
                    return (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>
                            {member.username?.toUpperCase() || 'USER'}
                          </Text>
                          {isOwnerMember && (
                            <Text style={styles.ownerBadge}>OWNER</Text>
                          )}
                        </View>
                        {!isOwnerMember && (
                          <TouchableOpacity
                            style={styles.removeMemberButton}
                            onPress={() => handleRemoveMember(member.user_id, member.username || 'User')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.removeMemberButtonText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>DANGER ZONE</Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteGroup}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>DELETE LEADERBOARD</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowSettingsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonTextCancel}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CreateChallengeModal
        visible={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          setSelectedUserId('');
          setSelectedUsername('');
        }}
        challengedUserId={selectedUserId}
        challengedUsername={selectedUsername}
        onChallengeCreated={() => {
          // Challenge created successfully
        }}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  viewProfileButtonText: {
    fontSize: 18,
  },
  challengeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
    minWidth: 40,
    minHeight: 40,
  },
  challengeButtonText: {
    fontSize: 16,
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
    color: '#FFFFFF',
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

