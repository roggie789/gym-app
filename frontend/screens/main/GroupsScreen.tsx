import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import {
  createGroup,
  getUserGroups,
  getGroupMembers,
  inviteToGroup,
  getUserGroupInvitations,
  acceptGroupInvitation,
  leaveGroup,
  Group,
  GroupInvitation,
} from '../../services/groupsService';
import { searchUsers, UserProfile } from '../../services/friendsService';

export default function GroupsScreen() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadInvitations();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;
    const { data } = await getUserGroups(user.id);
    const formattedGroups = (data || []).map((item: any) => ({
      ...item.group,
      user_role: item.role,
    }));
    setGroups(formattedGroups);
  };

  const loadInvitations = async () => {
    if (!user) return;
    const { data } = await getUserGroupInvitations(user.id);
    setInvitations(data || []);
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const { error } = await createGroup(groupName.trim(), groupDescription.trim(), user.id);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } else {
      Alert.alert('Success', 'Group created!');
      setShowCreateModal(false);
      setGroupName('');
      setGroupDescription('');
      loadGroups();
    }
  };

  const handleSearchUsers = async () => {
    if (!user || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const { data } = await searchUsers(searchQuery, user.id);
    setSearchResults(data || []);
    setLoading(false);
  };

  const handleInviteUser = async (userId: string) => {
    if (!user || !selectedGroup) return;

    const { error } = await inviteToGroup(selectedGroup.id, userId, user.id);
    if (error) {
      Alert.alert('Error', error.message || 'Failed to invite user');
    } else {
      Alert.alert('Success', 'Invitation sent!');
      setShowInviteModal(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!user) return;

    const { error } = await acceptGroupInvitation(invitationId, user.id);
    if (error) {
      Alert.alert('Error', 'Failed to accept invitation');
    } else {
      loadGroups();
      loadInvitations();
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    Alert.alert('Leave Group', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(groupId, user.id);
          loadGroups();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GROUPS</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>+ CREATE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {invitations.length > 0 && (
          <View style={styles.invitationsSection}>
            <Text style={styles.sectionTitle}>INVITATIONS ({invitations.length})</Text>
            {invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationGroupName}>
                    {invitation.group_name || 'Group'}
                  </Text>
                  <Text style={styles.invitationText}>Invited you to join</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptInviteButton}
                  onPress={() => handleAcceptInvitation(invitation.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptInviteText}>JOIN</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>YOUR GROUPS</Text>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>Create a group to compete with friends</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name.toUpperCase()}</Text>
                {group.description && (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                )}
                <Text style={styles.groupRole}>Role: {group.user_role?.toUpperCase()}</Text>
              </View>
              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={() => {
                    setSelectedGroup(group);
                    setShowInviteModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inviteButtonText}>INVITE</Text>
                </TouchableOpacity>
                {group.user_role !== 'owner' && (
                  <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={() => handleLeaveGroup(group.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.leaveButtonText}>LEAVE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE GROUP</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setGroupName('');
                  setGroupDescription('');
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>GROUP NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              placeholderTextColor={Colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              placeholderTextColor={Colors.textMuted}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setGroupName('');
                  setGroupDescription('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButtonModal]}
                onPress={handleCreateGroup}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>INVITE TO GROUP</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>SEARCH USERNAME</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                placeholder="Search..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchUsers}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchButtonSmall}
                onPress={handleSearchUsers}
                activeOpacity={0.8}
              >
                <Text style={styles.searchButtonTextSmall}>SEARCH</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.searchResultsList}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.searchResultItem}
                  onPress={() => handleInviteUser(result.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.searchResultUsername}>{result.username.toUpperCase()}</Text>
                  <Text style={styles.searchResultEmail}>{result.email}</Text>
                </TouchableOpacity>
              ))}
              {searchQuery && searchResults.length === 0 && !loading && (
                <Text style={styles.emptyText}>No users found</Text>
              )}
            </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  createButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invitationsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.secondary,
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  invitationCard: {
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
  invitationInfo: {
    flex: 1,
  },
  invitationGroupName: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  invitationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  acceptInviteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  acceptInviteText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  groupCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  groupInfo: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  groupDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  groupRole: {
    fontSize: 11,
    color: Colors.accent1,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  inviteButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  leaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  leaveButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.accent1,
    marginBottom: 10,
    marginTop: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  createButtonModal: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchButtonSmall: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.accent1,
    justifyContent: 'center',
  },
  searchButtonTextSmall: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchResultUsername: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  searchResultEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

