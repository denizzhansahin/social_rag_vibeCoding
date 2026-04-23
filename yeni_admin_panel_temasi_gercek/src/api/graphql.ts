import { gql } from '@apollo/client';

// ========================
// 👥 USERS & PROFILES
// ========================

export const GET_USERS_WITH_STATUS = gql`
  query GetUsersWithStatus {
    getUsersWithStatus {
      id
      email
      role
      status
      cognitiveProfile
      performanceMetrics
    }
  }
`;

export const GET_DETAILED_USER_PROFILE = gql`
  query GetDetailedUserProfile($userId: String!) {
    getDetailedUserProfile(userId: $userId) {
      id
      email
      role
      status
      lastLoginAt
      groups
      recentAttendances
      recentEngagements
      mentorEvaluations
      computedTags
      cognitiveProfile
      telemetrySummary
      performanceMetrics
      socialMedia
    }
  }
`;

export const GET_MINI_PROFILE = gql`
  query GetMiniProfile($userId: String!) {
    getMiniProfile(userId: $userId) {
      id
      email
      role
      traits
      stressIndex
      engagementStyle
      lastAction
      lastLocation
      groups
      cognitiveProfile
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($email: String!, $role: String!, $password: String, $cognitiveProfile: JSON) {
    createUser(email: $email, role: $role, password: $password, cognitiveProfile: $cognitiveProfile) {
      id
      email
      role
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($userId: String!, $updates: JSON!) {
    updateUser(userId: $userId, updates: $updates) {
      id
      email
      role
      status
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($userId: String!) {
    deleteUser(userId: $userId) {
      id
      status
    }
  }
`;

// ========================
// 🏢 GROUPS & DYNAMICS
// ========================

export const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
      mentorId
      createdAt
      aiInsights
      metadata
      assignedEvents {
        id
        title
      }
      mentors
      members
    }
  }
`;

export const GET_GROUP_MENTORS = gql`
  query GetGroupMentors($groupId: String!) {
    getGroupMentors(groupId: $groupId) {
      mentorId
      groupId
      isPrimary
      mentorProfile
    }
  }
`;

export const GET_GROUP_MEMBERS_DETAILED = gql`
  query GetGroupMembersDetailed($groupId: String!) {
    getGroupMembersDetailed(groupId: $groupId) {
      id
      email
      role
      status
      cognitiveProfile
      computedTags
      lastLoginAt
      joinedAt
    }
  }
`;

export const GET_GROUP_STATS = gql`
  query GetGroupStats($groupId: String!) {
    getGroupStats(groupId: $groupId) {
      memberCount
      avgStress
      avgLeadership
      avgPunctuality
      engagementBreakdown
    }
  }
`;

export const REQUEST_GROUP_INSIGHT = gql`
  mutation RequestGroupInsight($groupId: String!) {
    requestGroupInsight(groupId: $groupId)
  }
`;

export const DELETE_GROUP = gql`
  mutation DeleteGroup($id: String!) {
    deleteGroup(id: $id)
  }
`;

export const UPDATE_GROUP = gql`
  mutation UpdateGroup($id: String!, $input: UpdateGroupInput!) {
    updateGroup(id: $id, input: $input) {
      id
      name
    }
  }
`;

export const REMOVE_USER_FROM_GROUP = gql`
  mutation RemoveUserFromGroup($groupId: String!, $userId: String!) {
    removeUserFromGroup(groupId: $groupId, userId: $userId)
  }
`;

export const ADD_MENTOR_TO_GROUP = gql`
  mutation AddMentorToGroup($groupId: String!, $mentorId: String!, $isPrimary: Boolean) {
    addMentorToGroup(groupId: $groupId, mentorId: $mentorId, isPrimary: $isPrimary) {
      mentorId
      groupId
      isPrimary
    }
  }
`;

export const REMOVE_MENTOR_FROM_GROUP = gql`
  mutation RemoveMentorFromGroup($groupId: String!, $mentorId: String!) {
    removeMentorFromGroup(groupId: $groupId, mentorId: $mentorId)
  }
`;

export const UPDATE_PRIMARY_MENTOR = gql`
  mutation UpdatePrimaryMentor($groupId: String!, $mentorId: String!) {
    updateGroupPrimaryMentor(groupId: $groupId, mentorId: $mentorId)
  }
`;

// ========================
// 📅 EVENTS & ANALYTICS
// ========================

export const GET_EVENTS = gql`
  query GetEvents {
    getEvents {
      id
      title
      description
      eventType
      startTime
      location
      isActive
      assignedGroups {
        id
        name
      }
      assignments {
        id
        userId
        role
      }
    }
  }
`;

export const GET_EVENT_DETAIL = gql`
  query GetEventDetail($eventId: String!) {
    getEventDetail(eventId: $eventId) {
      attendance
      engagements
      avgFeedbackScore
      feedbackCount
      avgMentorScore
      mentorEvalCount
      assignedGroups {
        id
        name
      }
      assignments {
        id
        userId
        role
      }
    }
  }
`;

export const GET_ATTENDANCE_TREND = gql`
  query GetAttendanceTrend {
    getAttendanceTrend {
      eventId
      title
      eventType
      startTime
      totalAttendance
      onTimeCount
      lateCount
    }
  }
`;

export const GET_ATTENDANCE_BY_TYPE = gql`
  query GetAttendanceByType {
    getAttendanceByType {
      eventType
      eventCount
      avgAttendance
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id)
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
    }
  }
`;

export const UNASSIGN_GROUP_FROM_EVENT = gql`
  mutation UnassignGroupFromEvent($eventId: ID!, $groupId: ID!) {
    unassignGroupToEvent(eventId: $eventId, groupId: $groupId)
  }
`;

export const UNASSIGN_USER_FROM_EVENT = gql`
  mutation UnassignUserFromEvent($eventId: ID!, $userId: ID!) {
    unassignUserFromEvent(eventId: $eventId, userId: $userId)
  }
`;

// ========================
// 🕸️ NEO4J INTELLIGENCE
// ========================

export const GET_NETWORK_GRAPH = gql`
  query GetNetworkGraph {
    getNetworkGraph {
      nodes {
        id
        name
        label
      }
      links {
        source
        target
        label
      }
    }
  }
`;

export const GET_GROUP_NETWORK_GRAPH = gql`
  query GetGroupNetworkGraph($groupId: String!) {
    getGroupNetworkGraph(groupId: $groupId) {
      nodes {
        id
        name
        label
      }
      links {
        source
        target
        label
      }
    }
  }
`;

// ========================
// 📝 FEED POSTS
// ========================

export const GET_GLOBAL_FEED = gql`
  query GetGlobalFeed {
    getGlobalFeed {
      id
      authorId
      contentText
      postType
      isSystem
      isPinned
      reactions
      metadata
      createdAt
    }
  }
`;

export const GET_GROUP_FEED = gql`
  query GetGroupFeed($groupId: String!) {
    getGroupFeed(groupId: $groupId) {
      id
      authorId
      contentText
      postType
      isSystem
      isPinned
      reactions
      createdAt
    }
  }
`;

export const CREATE_FEED_POST = gql`
  mutation CreateFeedPost($input: CreatePostInput!) {
    createFeedPost(input: $input) {
      id
    }
  }
`;

export const DELETE_FEED_POST = gql`
  mutation DeleteFeedPost($postId: String!) {
    deleteFeedPost(postId: $postId)
  }
`;

export const ADD_REACTION = gql`
  mutation AddReaction($postId: String!, $userId: String!, $reactionType: String!) {
    addReaction(postId: $postId, userId: $userId, reactionType: $reactionType) {
      id
      reactions
    }
  }
`;

export const REMOVE_REACTION = gql`
  mutation RemoveReaction($postId: String!, $userId: String!, $reactionType: String!) {
    removeReaction(postId: $postId, userId: $userId, reactionType: $reactionType) {
      id
      reactions
    }
  }
`;

// ========================
// 🛡️ OPERATIONS & ACTIONS
// ========================

export const QUICK_CHECKIN = gql`
  mutation QuickCheckin($userId: String!, $eventCode: String!) {
    quickCheckin(userId: $userId, eventCode: $eventCode) {
      id
      userId
      scanTime
      punctuality
    }
  }
`;

// ========================
// ➕ CREATION & ASSIGNMENTS
// ========================

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      eventType
      startTime
      location
    }
  }
`;

export const ASSIGN_TO_EVENT = gql`
  mutation AssignToEvent($eventId: ID!, $userId: ID!, $role: EventAssignmentRole!, $notes: String) {
    assignToEvent(eventId: $eventId, userId: $userId, role: $role, notes: $notes) {
      id
      role
    }
  }
`;

export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) {
      id
      name
      mentorId
    }
  }
`;

export const ADD_MEMBER_TO_GROUP = gql`
  mutation AddMemberToGroup($input: AssignMemberInput!) {
    assignUserToGroup(input: $input) {
      id
      userId
      groupId
    }
  }
`;

export const ADD_EVALUATION = gql`
  mutation AddEvaluation($input: CreateEvaluationInput!) {
    createEvaluation(createEvaluationInput: $input) {
      id
      category
      score1to100
    }
  }
`;

export const GET_GLOBAL_TELEMETRY_STATS = gql`
  query GetGlobalTelemetryStats {
    getGlobalTelemetryStats {
      type
      action
      avgStress
      avgFocus
      avgScroll
      count
    }
  }
`;

export const GET_ALL_USERS_SIMPLE = gql`
  query GetAllUsersSimple {
    getUsersWithStatus {
      id
      email
      role
    }
  }
`;

export const GET_GROUPS_MINIMAL = gql`
  query GetGroupsMinimal {
    getGroups {
      id
      name
    }
  }
`;

export const GET_EVENTS_MINIMAL = gql`
  query GetEventsMinimal {
    getEvents {
      id
      title
    }
  }
`;

export const ASSIGN_USER_TO_GROUP = gql`
  mutation AssignUserToGroup($input: AssignMemberInput!) {
    assignUserToGroup(input: $input) {
      id
      userId
      groupId
    }
  }
`;

export const ASSIGN_GROUP_TO_EVENT = gql`
  mutation AssignGroupToEvent($eventId: ID!, $groupId: ID!) {
    assignGroupToEvent(eventId: $eventId, groupId: $groupId) {
      id
      eventId
      groupId
    }
  }
`;

export const TRIGGER_FULL_SYNC = gql`
  mutation TriggerFullSync {
    triggerFullSync
  }
`;

export const GET_FILTERED_GRAPH = gql`
  query GetFilteredGraph($id: ID!, $type: String) {
    getFilteredGraph(id: $id, type: $type) {
      nodes {
        id
        name
        label
      }
      links {
        source
        target
        label
      }
    }
  }
`;

// ========================
// 🤖 AI & INTELLIGENCE
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details. ----
// ========================

export const ASK_PALANTIR = gql`
  mutation AskPalantir($input: AskPalantirInput!) {
    askPalantirAgent(input: $input) {
      id
      queryText
      createdAt
    }
  }
`;

export const GET_ADMIN_CHAT_LOGS = gql`
  query GetAdminChatLogs($adminId: String!) {
    adminChatLogs(adminId: $adminId) {
      id
      queryText
      aiResponseText
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHAT_LOG = gql`
  query GetChatLog($id: String!) {
    getChatLog(id: $id) {
      id
      queryText
      aiResponseText
      status
      createdAt
    }
  }
`;

// ========================
// 📋 ONBOARDING
// ========================

export const GET_ACTIVE_ONBOARDING_QUESTIONS = gql`
  query GetActiveOnboardingQuestions {
    getActiveOnboardingQuestions {
      id
      questionText
      questionType
      options
      orderIndex
      isActive
    }
  }
`;

export const CREATE_ONBOARDING_QUESTION = gql`
  mutation CreateOnboardingQuestion($input: CreateOnboardingQuestionInput!) {
    createOnboardingQuestion(input: $input) {
      id
      questionText
    }
  }
`;

export const DELETE_ONBOARDING_QUESTION = gql`
  mutation DeleteOnboardingQuestion($id: String!) {
    deleteOnboardingQuestion(id: $id)
  }
`;

export const UPDATE_ONBOARDING_QUESTION = gql`
  mutation UpdateOnboardingQuestion($input: UpdateQuestionInput!) {
    updateOnboardingQuestion(input: $input) {
      id
      questionText
    }
  }
`;

export const GET_POTENTIAL_MATCHES = gql`
  query GetPotentialMatches {
    getPotentialMatches {
      source
      target
      label
    }
  }
`;

export const GET_PERSISTENT_MATCHES = gql`
  query GetPersistentMatches {
    getPersistentMatches {
      id
      userAId
      userBId
      userAName
      userBName
      similarityScore
      matchedAt
      role
      trait
    }
  }
`;

