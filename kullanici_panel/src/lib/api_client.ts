/**
 * V-RAG Production API Client
 * Environment-based URLs: Works in both dev and production
 */
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
// Environment-based URLs with localhost fallbacks
// In production, the Express proxy at /api/graphql forwards to API Gateway
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || '/api/ollama';
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/api/graphql';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// --- Ollama Direct API ---

interface OllamaChatResponse {
  response: string;
  done: boolean;
}

export async function chatWithOllama(
  message: string,
  systemPrompt?: string,
  model: string = 'gemma3:4b'
): Promise<string> {
  try {
    const payload: any = {
      model,
      prompt: message,
      stream: false,
    };
    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

    const data: OllamaChatResponse = await res.json();
    return data.response || 'Yanıt üretilemedi.';
  } catch (err) {
    console.error('[API] Ollama erişim hatası:', err);
    throw err;
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
// --- Media Upload API ---
export async function uploadMediaAPI(base64Data: string, mimeType: string): Promise<{ url: string, fileName: string }> {
  try {
    const uploadUrl = import.meta.env.VITE_GRAPHQL_URL 
      ? import.meta.env.VITE_GRAPHQL_URL.replace('/graphql', '/media/upload')
      : '/api/media/upload';

    const req = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, mimeType })
    });
    
    if (!req.ok) throw new Error('Yükleme başarısız');
    return await req.json();
  } catch (err) {
    console.error('[API] Upload Media Error:', err);
    throw err;
  }
}

// --- GraphQL API Client ---

let jwtToken: string | null = localStorage.getItem('vrag_jwt');

export function setAuthToken(token: string) {
  jwtToken = token;
  localStorage.setItem('vrag_jwt', token);
}

export function clearAuthToken() {
  jwtToken = null;
  localStorage.removeItem('vrag_jwt');
}

async function graphqlRequest<T>(query: string, variables?: Record<string, any>): Promise<T | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 401) {
      clearAuthToken();
      console.warn('[API] JWT expired, token cleared.');
      return null;
    }

    const json = await res.json();
    if (json.errors) {
      console.error('[API] GraphQL errors:', JSON.stringify(json.errors, null, 2));
      return null;
    }
    return json.data;
  } catch (err) {
    console.warn('[API] GraphQL unreachable, using offline mode.');
    return null;
  }
}

// --- Telemetry Batch Queue ---

interface TelemetryEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: number;
}

let telemetryQueue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function queueTelemetry(type: string, payload: Record<string, any>) {
  if (!payload.userId && !payload.user_id) {
    try {
      const userStr = localStorage.getItem('v_rag_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          payload.userId = user.id;
        }
      }
    } catch(e) {}
  }
  telemetryQueue.push({ type, payload, timestamp: Date.now() });

  // Auto-flush every 60 seconds
  if (!flushTimer) {
    flushTimer = setInterval(flushTelemetry, 60_000);
  }
}

export async function flushTelemetry() {
  if (telemetryQueue.length === 0) return;

  const batch = [...telemetryQueue];
  telemetryQueue = [];

  try {
    const result = await graphqlRequest(`
      mutation BatchTelemetry($events: [JSON!]!) {
        batchCreateTelemetry(events: $events)
      }
    `, { events: batch });

    if (!result) {
      // GraphQL unavailable — save to localStorage for later
      const offline = JSON.parse(localStorage.getItem('vrag_offline_telemetry') || '[]');
      offline.push(...batch);
      localStorage.setItem('vrag_offline_telemetry', JSON.stringify(offline));
      console.log(`[Telemetry] ${batch.length} events saved to offline queue.`);
    } else {
      console.log(`[Telemetry] ${batch.length} events flushed successfully.`);
    }
  } catch {
    const offline = JSON.parse(localStorage.getItem('vrag_offline_telemetry') || '[]');
    offline.push(...batch);
    localStorage.setItem('vrag_offline_telemetry', JSON.stringify(offline));
  }
}

// Try to flush offline queue on reconnect
export async function retryOfflineQueue() {
  const offline = JSON.parse(localStorage.getItem('vrag_offline_telemetry') || '[]');
  if (offline.length === 0) return;

  try {
    const result = await graphqlRequest(`
      mutation BatchTelemetry($events: [JSON!]!) {
        batchCreateTelemetry(events: $events)
      }
    `, { events: offline });

    if (result) {
      localStorage.removeItem('vrag_offline_telemetry');
      console.log(`[Telemetry] ${offline.length} offline events synced!`);
    }
  } catch {
    // Still offline, keep the queue
  }
}

// --- Engagement Submission ---

export async function submitEngagement(input: {
  userId: string;
  objectId: string;
  objectType: string;
  nature: string;
  action: string;
  seenAt?: string | null;
  interactedAt?: string | null;
  responseData: any;
  behavioralMetrics: any;
}) {
  if (!UUID_REGEX.test(input.userId) || !UUID_REGEX.test(input.objectId)) {
    console.warn('[API] Engagement skipped because userId/objectId is not a UUID.', input);
    return null;
  }

  const actionMap: Record<string, string | null> = {
    liked: 'liked',
    answered: 'answered',
    bookmarked: 'bookmarked',
    shared: 'bookmarked',
    commented: 'answered',
    upvoted: 'liked',
    downvoted: 'downvoted',
    attended: null,
    ignored: 'ignored',
    unliked: null,
  };

  const mappedAction = actionMap[input.action] ?? input.action;
  if (!mappedAction) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const sanitizedInput = {
    userId: input.userId,
    objectId: input.objectId,
    nature: input.nature === 'implicit' ? 'implicit' : 'explicit',
    action: mappedAction,
    seenAt: input.seenAt || nowIso,
    interactedAt: input.interactedAt || nowIso,
    responseData: JSON.stringify(input.responseData ?? {}),
    behavioralMetrics: JSON.stringify(input.behavioralMetrics ?? {}),
  };

  // Try GraphQL first
  const result = await graphqlRequest<{ createEngagement: { id: string } }>(`
    mutation CreateEngagement($input: CreateContentEngagementInput!) {
      createEngagement(input: $input) { id }
    }
  `, { input: sanitizedInput });

  if (!result) {
    // Fallback: queue locally
    queueTelemetry('engagement', sanitizedInput);
    console.log('[API] Engagement queued offline.');
  }

  return result;
}

export async function getUserEngagementsAPI(userId: string) {
  const result = await graphqlRequest<{ getUserEngagements: any[] }>(`
    query GetUserEngagements($userId: String!) {
      getUserEngagements(userId: $userId) {
        id objectId action responseData interactedAt
      }
    }
  `, { userId });
  return result?.getUserEngagements || [];
}

// --- Auth API ---

export async function loginUser(email: string, password: string) {
  const result = await graphqlRequest<{ login: { token: string; user: any } }>(`
    mutation Login($email: String!, $password: String!) {
      login(input: { email: $email, password: $password }) {
        token
        user { 
          id 
          email 
          role 
          groupId
          cognitiveProfile 
          hasCompletedOnboarding 
          socialLinks 
          telemetrySummary
          performanceMetrics
        }
      }
    }
  `, { email, password });

  if (result?.login) {
    setAuthToken(result.login.token);
    return result.login;
  }
  return null;
}

// --- Events API ---

export async function getEventsAPI() {
  const result = await graphqlRequest<{ getEvents: any[] }>(`
    query {
      getEvents {
        id title description eventType startTime endTime location groupId metadata isActive
        assignedGroups { id name }
        assignments { id userId role }
      }
    }
  `);
  return result?.getEvents || [];
}

export async function getEventsForUserAPI(userId: string) {
  const result = await graphqlRequest<{ getEventsForUser: any[] }>(`
    query GetEventsForUser($userId: String!) {
      getEventsForUser(userId: $userId) {
        id title description eventType startTime endTime location groupId metadata isActive
        assignedGroups { id name }
        assignments { id userId role }
      }
    }
  `, { userId });
  return result?.getEventsForUser || [];
}


export async function assignToEventAPI(eventId: string, userId: string, role: string = 'PARTICIPANT') {
  const result = await graphqlRequest<{ assignToEvent: any }>(`
    mutation AssignToEvent($eventId: ID!, $userId: ID!, $role: EventAssignmentRole!) {
      assignToEvent(eventId: $eventId, userId: $userId, role: $role) {
        id eventId userId role
      }
    }
  `, { eventId, userId, role: role.toUpperCase() });
  return result?.assignToEvent || null;
}

export async function updateEventAPI(id: string, input: Record<string, any>) {
  const result = await graphqlRequest<{ updateEvent: any }>(`
    mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
      updateEvent(id: $id, input: $input) {
        id
        metadata
      }
    }
  `, { id, input });
  return result?.updateEvent || null;
}

export async function quickCheckinAPI(userId: string, eventCode: string) {
  const result = await graphqlRequest<{ quickCheckin: any }>(`
    mutation QuickCheckin($userId: String!, $eventCode: String!) {
      quickCheckin(userId: $userId, eventCode: $eventCode) {
        id
        userId
        sessionId
        punctuality
        scanTime
      }
    }
  `, { userId, eventCode });
  return result?.quickCheckin || null;
}

// --- Users API ---

export async function getUsersAPI() {
  const result = await graphqlRequest<{ getUsersWithStatus: any[] }>(`
    query {
      getUsersWithStatus {
        id
        email
        role
        groupId
        cognitiveProfile
        socialLinks
        telemetrySummary
        performanceMetrics
        presenceStatus
      }
    }
  `);
  return result?.getUsersWithStatus || [];
}

// --- Chat API (Direct Ollama) ---

const USER_SYSTEM_PROMPT = `Sen V-RAG Vizyon Kampı'nın yapay zeka asistanısın. Adın "Vizyon AI".
Görevin kamp katılımcılarına yardımcı olmak, onları motive etmek ve kişisel gelişimlerine rehberlik etmektir.
Her zaman Türkçe konuş. Motive edici, samimi ve profesyonel ol.
Kısa ve enerji dolu yanıtlar ver (max 3 paragraf). İlgili emojiler kullan ama abartma.
Asla kullanıcıya veri toplandığını söyleme. Doğal ve arkadaşça ol.`;

export async function sendChatMessage(message: string, userContext?: string): Promise<string> {
  const systemPrompt = userContext
    ? `${USER_SYSTEM_PROMPT}\n\n[KULLANICI BAĞLAMI]\n${userContext}`
    : USER_SYSTEM_PROMPT;

  return chatWithOllama(message, systemPrompt);
}

// --- Feed & Mentor API ---

export async function getGroupsAPI() {
  const result = await graphqlRequest<{ getGroups: any[] }>(`
    query {
      getGroups {
        id name eventId mentorId mentors members
        mentorsDetailed { mentorId isPrimary mentorProfile }
        assignedEvents { id title }
      }
    }
  `);
  return result?.getGroups || [];
}

export async function getGlobalFeedAPI() {
  const result = await graphqlRequest<{ getGlobalFeed: any[] }>(`
    query {
      getGlobalFeed {
        id authorId groupId contentText postType scope isPinned isSystem attachments reactions metadata createdAt
      }
    }
  `);
  return result?.getGlobalFeed || [];
}

export async function getGroupFeedAPI(groupId: string) {
  const result = await graphqlRequest<{ getGroupFeed: any[] }>(`
    query GetGroupFeed($groupId: String!) {
      getGroupFeed(groupId: $groupId) {
        id authorId groupId contentText postType scope isPinned isSystem attachments reactions metadata createdAt
      }
    }
  `, { groupId });
  return result?.getGroupFeed || [];
}

export async function createFeedPostAPI(input: any) {
  // Ensure authorId is present as UUID
  if (!input.authorId || input.authorId === '') {
    const storedUser = localStorage.getItem('v_rag_user');
    if (storedUser) {
      input.authorId = JSON.parse(storedUser).id;
    }
  }

  // Clean undefined values — GraphQL doesn't accept undefined
  const cleanInput: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      cleanInput[key] = value;
    }
  }

  const result = await graphqlRequest<{ createFeedPost: any }>(`
    mutation CreateFeedPost($input: CreatePostInput!) {
      createFeedPost(input: $input) {
        id
        authorId
        groupId
        contentText
        postType
        scope
        isPinned
        isSystem
        reactions
        metadata
        createdAt
      }
    }
  `, { input: cleanInput });
  return result?.createFeedPost || null;
}

export async function addReactionAPI(postId: string, userId: string, reactionType: string) {
  const result = await graphqlRequest<{ addReaction: any }>(`
    mutation AddReaction($postId: String!, $userId: String!, $reactionType: String!) {
      addReaction(postId: $postId, userId: $userId, reactionType: $reactionType) {
        id reactions
      }
    }
  `, { postId, userId, reactionType });
  return result?.addReaction || null;
}

// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
export async function removeReactionAPI(postId: string, userId: string, reactionType: string) {
  const result = await graphqlRequest<{ removeReaction: any }>(`
    mutation RemoveReaction($postId: String!, $userId: String!, $reactionType: String!) {
      removeReaction(postId: $postId, userId: $userId, reactionType: $reactionType) {
        id reactions
      }
    }
  `, { postId, userId, reactionType });
  return result?.removeReaction || null;
}

export async function addCommentAPI(postId: string, userId: string, authorName: string, text: string) {
  const result = await graphqlRequest<{ addComment: any }>(`
    mutation AddComment($postId: String!, $userId: String!, $authorName: String!, $text: String!) {
      addComment(postId: $postId, userId: $userId, authorName: $authorName, text: $text) {
        id metadata
      }
    }
  `, { postId, userId, authorName, text });
  return result?.addComment || null;
}

// --- Mentor & Group Management API ---

export async function createGroupAPI(name: string, mentorId?: string, eventId?: string) {
  const result = await graphqlRequest<{ createGroup: any }>(`
    mutation CreateGroup($input: CreateGroupInput!) {
      createGroup(input: $input) {
        id name eventId mentorId
      }
    }
  `, { input: { name, mentorId, eventId } });
  return result?.createGroup || null;
}

export async function addMemberToGroupAPI(groupId: string, userId: string) {
  const result = await graphqlRequest<{ assignUserToGroup: any }>(`
    mutation AssignUserToGroup($input: AssignMemberInput!) {
      assignUserToGroup(input: $input) {
        id groupId userId
      }
    }
  `, { input: { groupId, userId } });
  return result?.assignUserToGroup || null;
}

export async function removeMemberFromGroupAPI(groupId: string, userId: string) {
  const result = await graphqlRequest<{ removeUserFromGroup: boolean }>(`
    mutation RemoveUserFromGroup($groupId: String!, $userId: String!) {
      removeUserFromGroup(groupId: $groupId, userId: $userId)
    }
  `, { groupId, userId });
  return result?.removeUserFromGroup || false;
}

export async function addMentorToGroupAPI(groupId: string, mentorId: string, isPrimary: boolean = false) {
  const result = await graphqlRequest<{ addMentorToGroup: any }>(`
    mutation AddMentorToGroup($groupId: String!, $mentorId: String!, $isPrimary: Boolean!) {
      addMentorToGroup(groupId: $groupId, mentorId: $mentorId, isPrimary: $isPrimary) {
        mentorId groupId isPrimary
      }
    }
  `, { groupId, mentorId, isPrimary });
  return result?.addMentorToGroup || null;
}

export async function createGroupEventAPI(input: {
  title: string;
  description?: string;
  startTime: string;
  location?: string;
  groupId?: string;
  createdBy: string;
}) {
  const result = await graphqlRequest<{ createEvent: any }>(`
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        id title startTime
      }
    }
  `, { input });
  return result?.createEvent || null;
}

// --- Onboarding API ---

export async function getOnboardingQuestionsAPI() {
  const result = await graphqlRequest<{ getActiveOnboardingQuestions: any[] }>(`
    query {
      getActiveOnboardingQuestions {
        id questionText questionType options orderIndex
      }
    }
  `);
  return result?.getActiveOnboardingQuestions || [];
}

export async function submitOnboardingAPI(userId: string, answers: { questionId: string, responseData: string }[]) {
  const result = await graphqlRequest<{ submitOnboarding: boolean }>(`
    mutation SubmitOnboarding($input: SubmitOnboardingInput!) {
      submitOnboarding(input: $input)
    }
  `, { input: { userId, answers } });
  return result?.submitOnboarding || false;
}

export async function getOnboardingResponsesAPI(userId: string) {
  const result = await graphqlRequest<{ getUserOnboardingResponses: any[] }>(`
    query GetUserOnboardingResponses($userId: String!) {
      getUserOnboardingResponses(userId: $userId) {
        id questionId responseData
      }
    }
  `, { userId });
  return result?.getUserOnboardingResponses || [];
}

// --- Initialize ---
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
export function initApiClient() {
  // Try syncing offline queue on startup
  retryOfflineQueue();

  // Check Ollama health
  checkOllamaHealth().then(ok => {
    if (ok) console.log('[API] ✅ Ollama bağlantısı aktif.');
    else console.warn('[API] ⚠️ Ollama bağlantısı yok. Chat devre dışı.');
  });
}

// --- AI Matching Data API ---

export async function fetchMyMatches(userId: string) {
  const query = `
    query GetMyMatches($userId: String!) {
      getMyMatches(userId: $userId) {
        id
        userAName
        userBName
        similarityScore
        matchedAt
      }
    }
  `;
  const data = await graphqlRequest<{ getMyMatches: any[] }>(query, { userId });
  return data?.getMyMatches || [];
}

export async function getDiscoveryRecommendationsAPI(userId: string) {
  const query = `
    query GetDiscoveryRecommendations($userId: String!) {
      getDiscoveryRecommendations(userId: $userId) {
        id
        name
        role
        trait
        similarityScore
      }
    }
  `;
  const data = await graphqlRequest<{ getDiscoveryRecommendations: any[] }>(query, { userId });
  return data?.getDiscoveryRecommendations || [];
}
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
export async function triggerMatchingSync() {
  const query = `
    mutation TriggerFullSync {
      triggerFullSync
    }
  `;
  const data = await graphqlRequest<{ triggerFullSync: boolean }>(query);
  return data?.triggerFullSync || null;
}
