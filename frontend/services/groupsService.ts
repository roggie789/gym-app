import { supabase } from '../config/supabase';

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  member_count?: number;
  user_role?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  username?: string;
  level?: number;
  total_points?: number;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  group_name?: string;
  inviter_username?: string;
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  username?: string;
  group_name?: string;
}

// Create a new group
export async function createGroup(name: string, description: string, createdBy: string, isPublic: boolean = false) {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      created_by: createdBy,
      is_public: isPublic,
    })
    .select()
    .single();

  if (data && !error) {
    // Add creator as owner
    await supabase.from('group_members').insert({
      group_id: data.id,
      user_id: createdBy,
      role: 'owner',
    });
  }

  return { data, error };
}

// Get user's groups
export async function getUserGroups(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      group:groups (
        id,
        name,
        description,
        created_by,
        is_public,
        created_at
      )
    `)
    .eq('user_id', userId);

  return { data: data || [], error };
}

// Get group members
export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error || !data) {
    return { data: [], error };
  }

  // Get user IDs
  const userIds = data.map(m => m.user_id);
  
  // Get usernames from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .in('id', userIds);

  // Create a map of user_id to profile
  const profileMap = new Map<string, { username: string; email: string }>();
  (profiles || []).forEach(profile => {
    profileMap.set(profile.id, { username: profile.username, email: profile.email });
  });

  // Add username and email to member records
  const membersWithProfiles = data.map(member => {
    const profile = profileMap.get(member.user_id);
    return {
      ...member,
      username: profile?.username,
      email: profile?.email,
      user: { id: member.user_id, email: profile?.email || '' },
    };
  });

  return { data: membersWithProfiles, error: null };
}

// Invite user to group
export async function inviteToGroup(groupId: string, invitedUserId: string, invitedBy: string) {
  // Check if user is already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', invitedUserId)
    .single();

  if (existing) {
    return { data: null, error: { message: 'User is already a member' } };
  }

  // Check if invitation already exists
  const { data: existingInvite } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .eq('invited_user_id', invitedUserId)
    .eq('status', 'pending')
    .single();

  if (existingInvite) {
    return { data: null, error: { message: 'Invitation already sent' } };
  }

  const { data, error } = await supabase
    .from('group_invitations')
    .insert({
      group_id: groupId,
      invited_by: invitedBy,
      invited_user_id: invitedUserId,
      status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

// Accept group invitation
export async function acceptGroupInvitation(invitationId: string, userId: string) {
  // Get invitation details
  const { data: invitation, error: inviteError } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (inviteError || !invitation) {
    return { data: null, error: inviteError };
  }

  // Add user to group
  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: invitation.group_id,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (memberError) {
    return { data: null, error: memberError };
  }

  // Update invitation status
  await supabase
    .from('group_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId);

  return { data: member, error: null };
}

// Get user's group invitations
export async function getUserGroupInvitations(userId: string) {
  const { data, error } = await supabase
    .from('group_invitations')
    .select(`
      *,
      group:groups (
        id,
        name,
        description
      )
    `)
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

// Leave group
export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return { error };
}

// Get all public groups (for discover)
export async function getPublicGroups(userId: string) {
  // Get groups that are public and user is not already a member of
  const { data: userGroups } = await getUserGroups(userId);
  const userGroupIds = (userGroups || []).map((g: any) => g.group?.id).filter(Boolean);

  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (user_id)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return { data: [], error };
  }

  // Filter out groups user is already in and add member count
  const publicGroups = data
    .filter((group: any) => !userGroupIds.includes(group.id))
    .map((group: any) => ({
      ...group,
      member_count: group.group_members?.length || 0,
    }));

  return { data: publicGroups, error: null };
}

// Join a public group directly
export async function joinPublicGroup(groupId: string, userId: string) {
  // Check if group is public
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('is_public')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    return { data: null, error: groupError || { message: 'Group not found' } };
  }

  if (!group.is_public) {
    return { data: null, error: { message: 'This group is private. Please request to join.' } };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { data: null, error: { message: 'Already a member' } };
  }

  // Add user to group
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  return { data, error };
}

// Request to join a private group
export async function requestToJoinGroup(groupId: string, userId: string) {
  // Check if group is private
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('is_public')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    return { data: null, error: groupError || { message: 'Group not found' } };
  }

  if (group.is_public) {
    return { data: null, error: { message: 'This group is public. You can join directly.' } };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return { data: null, error: { message: 'Already a member' } };
  }

  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('group_join_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();

  if (existingRequest) {
    return { data: null, error: { message: 'Join request already pending' } };
  }

  // Create join request
  const { data, error } = await supabase
    .from('group_join_requests')
    .insert({
      group_id: groupId,
      user_id: userId,
      status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

// Get join requests for a group (for owners/admins)
export async function getGroupJoinRequests(groupId: string) {
  const { data, error } = await supabase
    .from('group_join_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error || !data) {
    return { data: [], error };
  }

  // Get usernames
  const userIds = data.map(r => r.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username')
    .in('id', userIds);

  const usernameMap = new Map<string, string>();
  (profiles || []).forEach(profile => {
    usernameMap.set(profile.id, profile.username);
  });

  const requestsWithUsernames = data.map(request => ({
    ...request,
    username: usernameMap.get(request.user_id),
  }));

  return { data: requestsWithUsernames, error: null };
}

// Approve join request
export async function approveJoinRequest(requestId: string, groupId: string, userId: string, reviewedBy: string) {
  // Add user to group
  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (memberError) {
    return { data: null, error: memberError };
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('group_join_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', requestId);

  if (updateError) {
    return { data: null, error: updateError };
  }

  return { data: member, error: null };
}

// Reject join request
export async function rejectJoinRequest(requestId: string, reviewedBy: string) {
  const { error } = await supabase
    .from('group_join_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', requestId);

  return { error };
}

// Get user's pending join requests
export async function getUserJoinRequests(userId: string) {
  const { data, error } = await supabase
    .from('group_join_requests')
    .select(`
      *,
      group:groups (
        id,
        name,
        description
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error || !data) {
    return { data: [], error };
  }

  const requestsWithGroupNames = data.map(request => ({
    ...request,
    group_name: (request.group as any)?.name,
  }));

  return { data: requestsWithGroupNames, error: null };
}

// Update group (name and description)
export async function updateGroup(groupId: string, name: string, description: string) {
  const { data, error } = await supabase
    .from('groups')
    .update({
      name,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .select()
    .single();

  return { data, error };
}

// Remove member from group
export async function removeMemberFromGroup(groupId: string, memberId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId);

  return { error };
}

// Delete group (and all related data)
export async function deleteGroup(groupId: string) {
  // Delete group members (cascade should handle this, but being explicit)
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId);

  // Delete group invitations
  await supabase
    .from('group_invitations')
    .delete()
    .eq('group_id', groupId);

  // Delete join requests
  await supabase
    .from('group_join_requests')
    .delete()
    .eq('group_id', groupId);

  // Delete the group
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  return { error };
}

