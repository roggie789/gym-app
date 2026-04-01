import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
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
import { MobileShell } from '../../components/MobileShell';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar, AvatarFallback } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';

interface LeaderboardDetailScreenProps {
  groupId: string | 'global';
  groupData?: Group;
  onBack: () => void;
  onViewProfile?: (userId: string, username: string) => void;
}

export default function LeaderboardDetailScreen({ groupId, groupData, onBack, onViewProfile }: LeaderboardDetailScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
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
      showAlert({ title: 'Error', message: error.message || 'Failed to approve request' });
      return;
    }

    showAlert({ title: 'Success', message: 'Request approved' });
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
      showAlert({ title: 'Error', message: error.message || 'Failed to reject request' });
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
      showAlert({ title: 'Error', message: 'Please enter a group name' });
      return;
    }

    setLoading(true);
    const { error } = await updateGroup(groupId, editGroupName.trim(), editGroupDescription.trim());
    setLoading(false);

    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to update group' });
      return;
    }

    showAlert({ title: 'Success', message: 'Group updated successfully!' });
    setShowSettingsModal(false);
    onBack();
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!groupId || groupId === 'global') return;

    showAlert({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from this clan?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await removeMemberFromGroup(groupId, memberId);
            setLoading(false);

            if (error) {
              showAlert({ title: 'Error', message: error.message || 'Failed to remove member' });
              return;
            }

            showAlert({ title: 'Success', message: 'Member removed successfully' });
            const { data } = await getGroupMembers(groupId);
            setGroupMembers(data || []);
            loadLeaderboard();
          },
        },
      ],
    });
  };

  const handleDeleteGroup = async () => {
    if (!groupId || groupId === 'global') return;

    showAlert({
      title: 'Delete Clan',
      message: 'Are you sure you want to delete this clan? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await deleteGroup(groupId);
            setLoading(false);

            if (error) {
              showAlert({ title: 'Error', message: error.message || 'Failed to delete group' });
              return;
            }

            showAlert({ title: 'Success', message: 'Clan deleted successfully' });
            onBack();
          },
        },
      ],
    });
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <MobileShell noTabBar>
      <View style={styles.container}>
        <View style={styles.header}>
          <Button variant="ghost" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </Button>
          <Text style={styles.title}>{groupData?.name || 'Global'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isOwner && !isGlobal && (
          <View style={styles.ownerButtons}>
            <Button
              variant="secondary"
              onPress={handleViewRequests}
              style={styles.ownerButton}
            >
              Requests
            </Button>
            <Button
              variant="secondary"
              onPress={handleOpenSettings}
              style={styles.ownerButton}
            >
              Settings
            </Button>
          </View>
        )}

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                  ? 'Start working out to appear on the rankings!'
                  : 'No members in this group yet'}
              </Text>
            </View>
          ) : (
            leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === user?.id;
              const isTopThree = entry.rank <= 3;
              
              return (
                <Card
                  key={entry.user_id}
                  style={[
                    styles.leaderboardCard,
                    isCurrentUser && styles.leaderboardCardCurrent,
                  ]}
                >
                  <CardContent style={styles.cardContent}>
                    <View style={styles.cardRow}>
                      <View style={styles.rankSection}>
                        <Text style={[
                          styles.rankText,
                          isTopThree && styles.rankTextTopThree,
                        ]}>
                          {getRankDisplay(entry.rank)}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Avatar style={styles.avatar}>
                          <AvatarFallback>
                            {entry.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <View style={styles.userDetails}>
                          <Text style={styles.username}>
                            {entry.username}
                            {isCurrentUser && (
                              <Text style={styles.youLabel}> • You</Text>
                            )}
                          </Text>
                          <Text style={styles.userMetaText}>Level {entry.level}</Text>
                        </View>
                      </View>
                      <View style={styles.rightSection}>
                        <View style={styles.pointsSection}>
                          <Text style={styles.points}>{entry.total_points.toLocaleString()}</Text>
                          <Text style={styles.pointsLabel}>XP</Text>
                        </View>
                        <View style={styles.actions}>
                          {!isCurrentUser && (
                            <>
                              {onViewProfile && (
                                <Button
                                  variant="ghost"
                                  onPress={() => onViewProfile(entry.user_id, entry.username)}
                                  style={styles.actionButton}
                                >
                                  <Text style={styles.actionIcon}>👤</Text>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                onPress={() => {
                                  setSelectedUserId(entry.user_id);
                                  setSelectedUsername(entry.username);
                                  setShowChallengeModal(true);
                                }}
                                style={styles.actionButton}
                              >
                                <Text style={styles.actionIcon}>⚔️</Text>
                              </Button>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Join Requests Modal */}
      <Modal
        visible={showRequestsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <CardContent style={styles.modalCardContent}>
              <Text style={styles.modalTitle}>Join Requests</Text>
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
                    <Card key={request.id} style={styles.requestCard}>
                      <CardContent style={styles.requestCardContent}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.requestUsername}>
                            {request.username || 'User'}
                          </Text>
                          <Text style={styles.requestDate}>
                            {new Date(request.requested_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.requestButtons}>
                          <Button
                            variant="secondary"
                            onPress={() => handleApproveRequest(request.id, request.user_id)}
                            style={styles.requestButton}
                          >
                            <Text>✓</Text>
                          </Button>
                          <Button
                            variant="destructive"
                            onPress={() => handleRejectRequest(request.id)}
                            style={styles.requestButton}
                          >
                            <Text>✕</Text>
                          </Button>
                        </View>
                      </CardContent>
                    </Card>
                  ))
                )}
              </ScrollView>
              <Button
                variant="secondary"
                onPress={() => setShowRequestsModal(false)}
                style={styles.modalButton}
              >
                Close
              </Button>
            </CardContent>
          </Card>
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
          <Card style={styles.modalContent}>
            <CardContent style={styles.modalCardContent}>
              <Text style={styles.modalTitle}>Clan Settings</Text>
              
              <ScrollView style={styles.settingsContent}>
                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Edit Details</Text>
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Name</Text>
                    <Input
                      placeholder="Clan Name"
                      value={editGroupName}
                      onChangeText={setEditGroupName}
                      style={styles.modalInput}
                    />
                  </View>
                  <View style={styles.modalInputGroup}>
                    <Text style={styles.modalLabel}>Description (optional)</Text>
                    <TextInput
                      style={[styles.modalInput, styles.modalTextArea]}
                      placeholder="Description"
                      placeholderTextColor={Colors.textMuted}
                      value={editGroupDescription}
                      onChangeText={setEditGroupDescription}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <Button
                    onPress={handleUpdateGroup}
                    style={styles.modalButton}
                  >
                    Save Changes
                  </Button>
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Members ({groupMembers.length})</Text>
                  <ScrollView style={styles.membersList} nestedScrollEnabled>
                    {groupMembers.map((member) => {
                      const isOwnerMember = member.user_id === groupData?.created_by;
                      return (
                        <Card key={member.id} style={styles.memberCard}>
                          <CardContent style={styles.memberCardContent}>
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>
                                {member.username || 'User'}
                              </Text>
                              {isOwnerMember && (
                                <Badge variant="secondary" style={styles.ownerBadge}>
                                  Owner
                                </Badge>
                              )}
                            </View>
                            {!isOwnerMember && (
                              <Button
                                variant="destructive"
                                onPress={() => handleRemoveMember(member.user_id, member.username || 'User')}
                                style={styles.removeMemberButton}
                              >
                                <Text>✕</Text>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.settingsSection}>
                  <Text style={styles.settingsSectionTitle}>Danger Zone</Text>
                  <Button
                    variant="destructive"
                    onPress={handleDeleteGroup}
                    style={styles.modalButton}
                  >
                    Delete Clan
                  </Button>
                </View>
              </ScrollView>

              <Button
                variant="secondary"
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalButton}
              >
                Close
              </Button>
            </CardContent>
          </Card>
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
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 80,
  },
  ownerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ownerButton: {
    flex: 1,
    height: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  leaderboardCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
  },
  leaderboardCardCurrent: {
    borderColor: Colors.primary,
  },
  cardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankSection: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  rankTextTopThree: {
    fontSize: 18,
    lineHeight: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  youLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  userMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  pointsSection: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  pointsLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    minHeight: 28,
    alignItems: 'center',
  },
  actionButton: {
    width: 28,
    height: 28,
    padding: 0,
    minHeight: 28,
    minWidth: 28,
  },
  actionIcon: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
  },
  modalCardContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    height: 40,
    backgroundColor: Colors.backgroundSecondary,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalButton: {
    height: 44,
    marginTop: 8,
  },
  requestsList: {
    maxHeight: 400,
    marginBottom: 12,
  },
  requestsListContent: {
    paddingBottom: 0,
  },
  requestCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestCardContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestInfo: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    minHeight: 36,
    padding: 0,
  },
  settingsContent: {
    maxHeight: 500,
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  membersList: {
    maxHeight: 200,
  },
  memberCard: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberCardContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ownerBadge: {
    alignSelf: 'flex-start',
  },
  removeMemberButton: {
    width: 32,
    height: 32,
    minHeight: 32,
    padding: 0,
  },
});
