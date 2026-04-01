import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import {
  createGroup,
  joinPublicGroup,
  requestToJoinGroup,
  Group,
} from '../../services/groupsService';
import { useMyGroups, usePublicGroups, useInvalidate } from '../../hooks/useQueryHooks';
import { MobileShell } from '../../components/MobileShell';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

type TabType = 'my' | 'discover';

interface LeaderboardScreenProps {
  onSelectLeaderboard?: (groupId: string | 'global', groupData?: Group) => void;
  noTopPadding?: boolean;
}

export default function LeaderboardScreen({ onSelectLeaderboard, noTopPadding }: LeaderboardScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const invalidate = useInvalidate();
  const [activeTab, setActiveTab] = useState<TabType>('my');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const { data: myGroups = [] } = useMyGroups();
  const { data: publicGroups = [], isLoading: publicLoading } = usePublicGroups(activeTab === 'discover');

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
      showAlert({ title: 'Error', message: 'Please enter a group name' });
      return;
    }

    setLoading(true);
    const { data, error } = await createGroup(newGroupName.trim(), newGroupDescription.trim(), user.id, isPublic);
    setLoading(false);

    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to create group' });
      return;
    }

    showAlert({ title: 'Success', message: 'Group created successfully!' });
    setShowCreateModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setIsPublic(true);
    invalidate.myGroups();
    if (data) {
      onSelectLeaderboard?.(data.id, data);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await joinPublicGroup(groupId, user.id);
    setLoading(false);

    if (error) {
      if (error.message?.includes('private')) {
        const { data: requestData, error: requestError } = await requestToJoinGroup(groupId, user.id);
        if (requestError) {
          showAlert({ title: 'Error', message: requestError.message || 'Failed to request to join' });
        } else {
          showAlert({ title: 'Request Sent', message: 'Your request to join has been sent to the group owner' });
          invalidate.publicGroups();
        }
      } else {
        showAlert({ title: 'Error', message: error.message || 'Failed to join group' });
      }
      return;
    }

    showAlert({ title: 'Success', message: 'Joined group successfully!' });
    invalidate.myGroups();
    invalidate.publicGroups();
    setActiveTab('my');
    const groupData = publicGroups.find(g => g.id === groupId);
    onSelectLeaderboard?.(groupId, groupData);
  };

  return (
    <MobileShell noTopPadding={noTopPadding}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CLANS</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
            onPress={() => setActiveTab('my')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              MY CLANS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
            onPress={() => setActiveTab('discover')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
              DISCOVER
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'my' ? (
            <>
              <View style={styles.groupSelectorContainer}>
                <Text style={styles.groupSelectorTitle}>SELECT CLAN</Text>
                <View style={styles.groupChips}>
                  <TouchableOpacity
                    style={styles.groupChip}
                    onPress={() => handleSelectLeaderboard('global')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groupChipText}>GLOBAL</Text>
                  </TouchableOpacity>
                  {myGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.groupChip}
                      onPress={() => handleSelectLeaderboard(group.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.groupChipText}>
                        {group.name.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>Select a clan to view</Text>
                <Text style={styles.emptySubtext}>
                  Choose a clan from the list above to see rankings
                </Text>
              </View>
            </>
          ) : (
            <>
              {publicLoading ? (
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
                  <Card key={group.id} style={styles.groupCard}>
                    <CardContent style={styles.groupCardContent}>
                      <View style={styles.groupCardHeader}>
                        <Text style={styles.groupCardName}>{group.name}</Text>
                        {group.description && (
                          <Text style={styles.groupCardDescription}>{group.description}</Text>
                        )}
                        <View style={styles.groupCardMeta}>
                          <Text style={styles.groupCardMetaText}>
                            {group.member_count || 0} members
                          </Text>
                          <Text style={[styles.groupCardMetaText, styles.groupCardMetaDot]}>•</Text>
                          <Text style={styles.groupCardMetaText}>
                            {group.is_public ? 'Public' : 'Private'}
                          </Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={styles.bottomButtons}>
          <Button
            variant="secondary"
            onPress={() => setActiveTab('discover')}
            style={styles.bottomButton}
          >
            Join
          </Button>
          <Button
            onPress={() => setShowCreateModal(true)}
            style={styles.bottomButton}
          >
            Create
          </Button>
        </View>
      </View>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Card style={styles.modalContent}>
            <CardContent style={styles.modalCardContent}>
              <Text style={styles.modalTitle}>Create Clan</Text>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Name</Text>
                <Input
                  placeholder="Clan Name"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  style={styles.modalInput}
                />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Description"
                  placeholderTextColor={Colors.textMuted}
                  value={newGroupDescription}
                  onChangeText={setNewGroupDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.modalSwitchContainer}>
                <Text style={styles.modalSwitchLabel}>Public Clan</Text>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={isPublic ? Colors.textPrimary : Colors.textSecondary}
                />
              </View>
              <Text style={styles.modalSwitchHint}>
                {isPublic
                  ? 'Anyone can join this clan'
                  : 'Users must request to join (requires approval)'}
              </Text>
              <View style={styles.modalButtons}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                    setNewGroupDescription('');
                    setIsPublic(true);
                  }}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleCreateGroup}
                  style={styles.modalButton}
                >
                  Create
                </Button>
              </View>
            </CardContent>
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
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
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondaryBorder,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.backgroundCard,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 11,
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
    paddingBottom: 100, // Space for bottom buttons
  },
  groupSelectorContainer: {
    marginBottom: 20,
  },
  groupSelectorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  groupCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
  },
  groupCardContent: {
    padding: 12,
  },
  groupCardHeader: {
    gap: 4,
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  groupCardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  groupCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  groupCardMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  groupCardMetaDot: {
    marginHorizontal: 6,
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
  bottomButtons: {
    position: 'absolute',
    bottom: 15,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  bottomButton: {
    flex: 1,
    height: 44,
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
  },
  modalSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalSwitchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalSwitchHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 44,
  },
});
