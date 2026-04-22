import React, { createContext, useContext, useState } from 'react';
import { User, Role, Badge } from './AuthContext';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type PostScope = 'global' | 'group';

export type Post = {
  id: string;
  objectType: 'text_post' | 'slider_survey' | 'multiple_choice' | 'mood_checkin';
  createdBy: string;
  authorName: string;
  createdAt: string;
  groupId?: string;
  scope: PostScope;        // 'global' → Akış, 'group' → Grubum
  isSystem?: boolean;       // Mentör/Admin sistem gönderisi
  isPinned?: boolean;       // Sabitlenmiş (her zaman üstte)
  reactions?: Record<string, string[]>;
  myEngagement?: {
    action: string;
    responseData: any;
    interactedAt: string;
  };
  uiPayload: any;
};

export type Group = {
  id: string;
  name: string;
  mentors: User[];         // Detailed mentors
  members: User[];         // Participants
  memberCount: number;
  avgEngagement: number;
  avgXP?: number;
  totalStreaks?: number;
  aiInsights?: any;
  createdAt: string;
};

export type EventComment = {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
};

export type EventQuestion = {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
  upvotes: string[];
  downvotes: string[];
};

export type EventSurveyType = 'multiple_choice' | 'ranked' | 'text';

export type EventSurvey = {
  id: string;
  question: string;
  type: EventSurveyType;
  options?: string[];
  createdBy: string;
  createdAt: string;
  responses: { userId: string; answer: string | number }[];
};

export type AppEvent = {
  id: string;
  name: string;
  date: string;
  description: string;
  groupId: string;
  createdBy?: string;
  metadata?: any;
  participants: User[];
  attendedParticipants?: string[];
  location?: string;
  speakers?: { 
    name: string; 
    bio: string; 
    avatar: string;
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
    }
  }[];
  agenda?: { time: string; title: string }[];
  comments?: EventComment[];
  questions?: EventQuestion[];
  surveys?: EventSurvey[];
};

interface DataContextType {
  users: User[];
  groups: Group[];
  posts: Post[];
  events: AppEvent[];

  // Post actions
  addPost: (post: Post) => Promise<void>;

  // Event actions
  addEvent: (event: AppEvent) => void;
  registerForEvent: (eventId: string, user: User) => void;
  addEventComment: (eventId: string, text: string, authorName: string) => void;
  addEventQuestion: (eventId: string, text: string, authorName: string) => void;
  voteQuestion: (eventId: string, questionId: string, userId: string, voteType: 'up' | 'down') => void;
  addEventSurvey: (eventId: string, survey: Omit<EventSurvey, 'id' | 'createdAt' | 'responses'>) => void;
  submitSurveyResponse: (eventId: string, surveyId: string, userId: string, answer: string | number) => void;
  markAttendance: (eventId: string, userId: string) => void;

  // Mentor actions
  createGroup: (name: string, mentorId: string) => string;
  addMemberToGroup: (groupId: string, userId: string) => void;
  removeMemberFromGroup: (groupId: string, userId: string) => void;
  addMentorToGroup: (groupId: string, mentorId: string) => void;
  createGroupEvent: (event: Partial<AppEvent>, groupId: string, mentorId: string) => void;
  takeAttendance: (eventId: string, userIds: string[]) => void;
  createSystemPost: (groupId: string | null, post: Omit<Post, 'id' | 'createdAt' | 'isSystem' | 'isPinned' | 'scope'>, pinned?: boolean) => void;

  // Helpers
  getGroupById: (groupId: string) => Group | undefined;
  getUserGroups: (userId: string) => Group[];
  getGroupMentors: (groupId: string) => User[];
  submitPostEngagement: (postId: string, action: 'liked' | 'answered' | 'bookmarked' | 'unliked', responseData?: any) => Promise<void>;
  addPostComment: (postId: string, text: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================
import {
  getGlobalFeedAPI, getGroupFeedAPI, getGroupsAPI, getEventsAPI, getEventsForUserAPI, getUsersAPI, createFeedPostAPI,
  createGroupAPI, addMemberToGroupAPI, removeMemberFromGroupAPI, createGroupEventAPI, addMentorToGroupAPI,
  submitEngagement, addReactionAPI, removeReactionAPI, addCommentAPI, assignToEventAPI, updateEventAPI, quickCheckinAPI,
  getUserEngagementsAPI
} from '../lib/api_client';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string) {
  return !!value && UUID_REGEX.test(value);
}

function normalizePostType(postType?: string): Post['objectType'] {
  switch (postType) {
    case 'text':
    case 'text_post':
    case 'announcement':
    case 'event_comment':
    case 'event_question':
      return 'text_post';
    case 'multiple_choice':
      return 'multiple_choice';
    case 'slider_survey':
      return 'slider_survey';
    case 'mood_checkin':
      return 'mood_checkin';
    default:
      return 'text_post';
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        // 1. Load users from API
        const fetchedUsers = await getUsersAPI();
        const parsedUsers: User[] = fetchedUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role as Role,
          groupId: u.groupId || u.cognitiveProfile?.group || '',
          name: u.cognitiveProfile?.name || u.email.split('@')[0],
          cognitiveProfile: u.cognitiveProfile || { name: u.email.split('@')[0], age: 0, trait: 'Katılımcı' },
          socialLinks: u.socialLinks || {},
          telemetrySummary: u.telemetrySummary,
          performanceMetrics: u.performanceMetrics,
        }));
        setUsers(parsedUsers);

        // 3. Load feeds based on latest user data
        const storedAuth = localStorage.getItem('v_rag_user');
        const storedAuthUser = storedAuth ? JSON.parse(storedAuth) : null;
        const authId = storedAuthUser?.id || null;
        
        // Find the current user in the FRESH list to get latest groupId
        const freshCurrentUser = parsedUsers.find(u => u.id === authId);
        const currentGroupId =
          freshCurrentUser?.groupId ||
          freshCurrentUser?.cognitiveProfile?.group ||
          storedAuthUser?.groupId ||
          storedAuthUser?.cognitiveProfile?.group ||
          null;

        if (freshCurrentUser && storedAuth) {
          // Sync localStorage if it was stale
          const authObj = JSON.parse(storedAuth);
          if (currentGroupId && authObj.groupId !== currentGroupId) {
            authObj.groupId = currentGroupId;
            localStorage.setItem('v_rag_user', JSON.stringify(authObj));
            console.log(`[DataContext] Synced stale groupId: ${currentGroupId}`);
          }
        }

        const [fetchedGlobal, fetchedGroup, fetchedEngagements] = await Promise.all([
          getGlobalFeedAPI(),
          currentGroupId ? getGroupFeedAPI(currentGroupId) : Promise.resolve([]),
          authId ? getUserEngagementsAPI(authId) : Promise.resolve([])
        ]);

        const allFetchedPosts = [...fetchedGlobal, ...fetchedGroup];
        
        // Map engagements by objectId
        const engagementMap = new Map();
        fetchedEngagements.forEach((e: any) => {
          // If multiple, last one (interactedAt DESC) stays
          if (!engagementMap.has(e.objectId)) {
            engagementMap.set(e.objectId, e);
          }
        });

        // Remove duplicates if any
        const uniquePostsMap = new Map();
        allFetchedPosts.forEach(p => uniquePostsMap.set(p.id, p));

        const resolveAuthorName = (authorId: string, isSystem?: boolean): string => {
          if (isSystem) return 'Sistem';
          const author = parsedUsers.find(u => u.id === authorId);
          if (author) return author.cognitiveProfile?.name || author.name || author.email?.split('@')[0] || 'Kullanıcı';
          return 'Kullanıcı';
        };

        const apiPosts: Post[] = Array.from(uniquePostsMap.values()).map((p: any) => {
          const attachments = p.metadata?.attachments || [];
          let text = (p.metadata && p.metadata.text) || p.contentText || '';
          
          if (!text && attachments.length > 0) {
            text = '📷 Fotoğraf paylaştı';
          }

          const myEngagement = engagementMap.get(p.id);

          return {
            id: p.id,
            objectType: normalizePostType(p.postType),
            createdBy: p.authorId,
            authorName: resolveAuthorName(p.authorId, p.isSystem),
            createdAt: p.createdAt,
            groupId: p.groupId,
            scope: p.scope || (p.groupId ? 'group' : 'global'),
            isSystem: p.isSystem,
            isPinned: p.isPinned,
            reactions: p.reactions || {},
            myEngagement: myEngagement,
            uiPayload: p.metadata && Object.keys(p.metadata).length > 0
              ? { text, allowComments: true, ...p.metadata, attachments }
              : { text, allowComments: true, attachments },
          };
        }).filter(p => !p.uiPayload?.eventId && (!!p.uiPayload?.text || (p.uiPayload?.attachments?.length > 0))); 
        setPosts(apiPosts);

        // 4. Load groups
        try {
          const fetchedGroups = await getGroupsAPI();
          const parsedGroups: Group[] = fetchedGroups.map((g: any) => {
            // Parse mentors: use mentorsDetailed if available, fallback to mentors array
            let mentorUsers: User[] = [];
            if (g.mentorsDetailed && g.mentorsDetailed.length > 0) {
              mentorUsers = g.mentorsDetailed.map((md: any) => {
                const found = parsedUsers.find(u => u.id === md.mentorId);
                if (found) return found;
                // Build from mentorProfile if user not in parsed list
                if (md.mentorProfile) {
                  return {
                    id: md.mentorId,
                    email: md.mentorProfile.email || '',
                    role: 'mentor' as Role,
                    name: md.mentorProfile.name || md.mentorProfile.email?.split('@')[0] || 'Mentör',
                    cognitiveProfile: md.mentorProfile,
                  } as User;
                }
                return null;
              }).filter(Boolean) as User[];
            } else {
              mentorUsers = (g.mentors || []).map((m: any) => {
                const mId = typeof m === 'string' ? m : m.id;
                return parsedUsers.find(u => u.id === mId);
              }).filter(Boolean) as User[];
            }

            // Also include the legacy mentorId if present
            if (g.mentorId && !mentorUsers.find(m => m.id === g.mentorId)) {
              const legacyMentor = parsedUsers.find(u => u.id === g.mentorId);
              if (legacyMentor) mentorUsers.push(legacyMentor);
            }

            const memberUsers = (g.members || []).map((m: any) => {
              const mId = typeof m === 'string' ? m : m.id;
              return parsedUsers.find(u => u.id === mId);
            }).filter(Boolean) as User[];

            return {
              id: g.id,
              name: g.name,
              mentors: mentorUsers,
              members: memberUsers,
              memberCount: g.memberCount || (mentorUsers.length + memberUsers.length),
              avgEngagement: g.avgEngagement || (memberUsers.length > 0 ? Math.round(memberUsers.reduce((a, m) => a + (m.performanceMetrics?.engagement || 0), 0) / memberUsers.length) : 0),
              createdAt: g.createdAt || new Date().toISOString(),
            };
          });
          setGroups(parsedGroups);
        } catch (groupError) {
          console.error('[DataContext] Groups load error:', groupError);
        }

        // 5. Load events (herkes için getEvents + mentör için getEventsForUser)
        try {
          const isMentorUser = freshCurrentUser && ['mentor', 'teacher', 'admin'].includes(freshCurrentUser.role || '');
          
          const [allEvents, mentorEvents] = await Promise.all([
            getEventsAPI(),
            (isMentorUser && authId) ? getEventsForUserAPI(authId) : Promise.resolve([]),
          ]);

          // Birleştir ve tekrarları kaldır
          const eventsMap = new Map<string, any>();
          [...allEvents, ...mentorEvents].forEach((e: any) => eventsMap.set(e.id, e));
          const fetchedEvents = Array.from(eventsMap.values());

          const parseEvent = (e: any): AppEvent => {
            const eventParticipants = (e.assignments || [])
              .map((asm: any) => parsedUsers.find(u => u.id === asm.userId))
              .filter(Boolean) as User[];

            const eventGroupId = e.assignedGroups && e.assignedGroups.length > 0 
              ? e.assignedGroups[0].id 
              : (e.groupId || 'global');

            return {
              id: e.id,
              name: e.title,
              date: e.startTime,
              description: e.description || '',
              groupId: eventGroupId,
              metadata: e.metadata || {},
              location: e.location,
              participants: eventParticipants,
              attendedParticipants: (e.metadata?.attended || []),
              comments: (e.metadata?.comments || []),
              questions: (e.metadata?.questions || []),
              surveys: (e.metadata?.surveys || []),
            };
          };

          setEvents(fetchedEvents.map(parseEvent));
        } catch (eventError) {
          console.error('[DataContext] Events load error:', eventError);
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('[DataContext] API veri yükleme hatası:', err);
        setIsLoaded(true); // Still mark as loaded to show empty state
      }
    }
    loadData();
  }, []);

  // --- Post actions ---
  const addPost = async (post: Post) => {
    setPosts(prev => [post, ...prev]);
    // Persist to backend
    try {
      const savedPost = await createFeedPostAPI({
        authorId: post.createdBy,
        contentText: post.uiPayload?.text || '',
        scope: post.scope || 'global',
        postType: post.objectType === 'text_post' ? 'text' : (post.objectType || 'text'),
        groupId: post.groupId,
        isSystem: post.isSystem || false,
        isPinned: post.isPinned || false,
        metadata: post.uiPayload,
      });

      if (!savedPost?.id) {
        throw new Error('createFeedPost mutation failed');
      }

      setPosts(prev => prev.map(existing => (
        existing.id === post.id
          ? {
              ...existing,
              id: savedPost.id,
              objectType: normalizePostType(savedPost.postType),
              createdBy: savedPost.authorId || existing.createdBy,
              createdAt: savedPost.createdAt || existing.createdAt,
              reactions: savedPost.reactions || existing.reactions || {},
              uiPayload: savedPost.metadata && Object.keys(savedPost.metadata).length > 0
                ? savedPost.metadata
                : existing.uiPayload,
            }
          : existing
      )));
    } catch (err) {
      setPosts(prev => prev.filter(existing => existing.id !== post.id));
      console.error('[DataContext] Post kaydetme hatası:', err);
      throw err;
    }
  };

  // --- Event actions ---
  const addEvent = (event: AppEvent) => setEvents([...events, event]);
  
  const registerForEvent = async (eventId: string, user: User) => {
    try {
      const assignment = await assignToEventAPI(eventId, user.id, 'participant');
      if (!assignment) {
        throw new Error('assignToEvent mutation failed');
      }
      
      // Update local state optimistically or re-fetch
      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          if (!evt.participants.find(p => p.id === user.id)) {
            return { ...evt, participants: [...evt.participants, user] };
          }
        }
        return evt;
      }));
      console.log(`[DataContext] Registered ${user.name} for event ${eventId}`);
    } catch (error) {
      console.error('[DataContext] Registration error:', error);
    }
  };

  const addEventComment = async (eventId: string, text: string, authorName: string) => {
    try {
      const currentEvent = events.find(evt => evt.id === eventId);
      if (!currentEvent) throw new Error('Event not found');
      const newComment = {
        id: Math.random().toString(),
        text,
        authorName,
        createdAt: new Date().toISOString(),
      };
      const metadata = {
        ...(currentEvent as any).metadata,
        comments: [...(currentEvent.comments || []), newComment],
        questions: currentEvent.questions || [],
        surveys: currentEvent.surveys || [],
        attended: currentEvent.attendedParticipants || [],
      };
      const updatedEvent = await updateEventAPI(eventId, { metadata });
      if (!updatedEvent?.id) throw new Error('updateEvent mutation failed');

      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return { ...evt, comments: metadata.comments };
        }
        return evt;
      }));
    } catch (error) {
      console.error('[DataContext] Error adding comment:', error);
    }
  };

  const addEventQuestion = async (eventId: string, text: string, authorName: string) => {
    try {
      const currentEvent = events.find(evt => evt.id === eventId);
      if (!currentEvent) throw new Error('Event not found');
      const newQuestion = {
        id: Math.random().toString(),
        text,
        authorName,
        createdAt: new Date().toISOString(),
        upvotes: [],
        downvotes: []
      };
      const metadata = {
        ...(currentEvent as any).metadata,
        comments: currentEvent.comments || [],
        questions: [...(currentEvent.questions || []), newQuestion],
        surveys: currentEvent.surveys || [],
        attended: currentEvent.attendedParticipants || [],
      };
      const updatedEvent = await updateEventAPI(eventId, { metadata });
      if (!updatedEvent?.id) throw new Error('updateEvent mutation failed');

      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return { ...evt, questions: metadata.questions };
        }
        return evt;
      }));
    } catch (error) {
      console.error('[DataContext] Error adding question:', error);
    }
  };

  const voteQuestion = async (eventId: string, questionId: string, userId: string, voteType: 'up' | 'down') => {
    try {
      const authUser = JSON.parse(localStorage.getItem('v_rag_user') || '{}');
      await (submitEngagement as any)({
        userId: authUser.id,
        objectId: questionId,
        objectType: 'question',
        action: voteType === 'up' ? 'upvoted' : 'downvoted',
        nature: 'behavioral',
        responseData: { eventId, voteType },
        behavioralMetrics: { type: 'engagement', score: 1 }
      });
      
      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return {
            ...evt,
            questions: evt.questions.map(q => {
              if (q.id === questionId) {
                const upvotes = [...q.upvotes];
                const downvotes = [...q.downvotes];
                
                if (voteType === 'up') {
                  if (!upvotes.includes(userId)) upvotes.push(userId);
                  const dIdx = downvotes.indexOf(userId);
                  if (dIdx > -1) downvotes.splice(dIdx, 1);
                } else {
                  if (!downvotes.includes(userId)) downvotes.push(userId);
                  const uIdx = upvotes.indexOf(userId);
                  if (uIdx > -1) upvotes.splice(uIdx, 1);
                }
                
                return { ...q, upvotes, downvotes };
              }
              return q;
            })
          };
        }
        return evt;
      }));
    } catch (error) {
      console.error('[DataContext] Error voting:', error);
    }
  };

  const addEventSurvey = async (eventId: string, survey: Omit<EventSurvey, 'id' | 'createdAt' | 'responses'>) => {
    try {
      const currentEvent = events.find(evt => evt.id === eventId);
      if (!currentEvent) throw new Error('Event not found');
      const newSurvey: EventSurvey = { ...survey, id: `s-${Date.now()}`, createdAt: new Date().toISOString(), responses: [] };
      const metadata = {
        ...(currentEvent as any).metadata,
        comments: currentEvent.comments || [],
        questions: currentEvent.questions || [],
        surveys: [newSurvey, ...(currentEvent.surveys || [])],
        attended: currentEvent.attendedParticipants || [],
      };
      const updatedEvent = await updateEventAPI(eventId, { metadata });
      if (!updatedEvent?.id) throw new Error('updateEvent mutation failed');

      setEvents(prev => prev.map(e => (
        e.id === eventId ? { ...e, surveys: metadata.surveys } : e
      )));
    } catch (error) {
      console.error('[DataContext] Error adding survey:', error);
    }
  };

  const submitSurveyResponse = async (eventId: string, surveyId: string, userId: string, answer: string | number) => {
    try {
      await (submitEngagement as any)({
        userId,
        objectId: surveyId,
        objectType: 'survey',
        action: 'answered',
        nature: 'behavioral',
        responseData: { eventId, answer },
        behavioralMetrics: { type: 'engagement', score: 2 }
      });
    } catch (err) {
      console.error('[DataContext] Survey submit error:', err);
    }

    setEvents(events.map(e => {
      if (e.id === eventId) {
        const updatedSurveys = e.surveys?.map(s => {
          if (s.id === surveyId) {
            const newResponses = [...s.responses];
            const idx = newResponses.findIndex(r => r.userId === userId);
            idx >= 0 ? newResponses[idx] = { userId, answer } : newResponses.push({ userId, answer });
            return { ...s, responses: newResponses };
          }
          return s;
        });
        return { ...e, surveys: updatedSurveys };
      }
      return e;
    }));
  };

  const markAttendance = async (eventId: string, userId: string) => {
    try {
      const checkin = await quickCheckinAPI(userId, eventId);
      if (!checkin?.id) {
        throw new Error('quickCheckin mutation failed');
      }
    } catch (err) {
      console.error('[DataContext] Attendance error:', err);
      return;
    }

    setEvents(events.map(e => {
      if (e.id === eventId) {
        const attended = e.attendedParticipants || [];
        if (!attended.includes(userId)) return { ...e, attendedParticipants: [...attended, userId] };
      }
      return e;
    }));
  };

  // --- Mentor actions ---
  const createGroup = (name: string, mentorId: string): string => {
    const newId = `grp-${Date.now()}`;
    const mentor = users.find(u => u.id === mentorId);
    
    // Persist to backend
    createGroupAPI(name, mentorId).then(apiGroup => {
      if (apiGroup) {
        // Sync local state with real ID if necessary, but for now we trust the flow
        console.log('[DataContext] Group created in backend:', apiGroup.id);
      }
    });

    if (!mentor) return newId;

    const newGroup: Group = {
      id: newId, name, mentors: [mentor], members: [],
      memberCount: 1, avgEngagement: 0, avgXP: 0, totalStreaks: 0,
      createdAt: new Date().toISOString(),
    };
    setGroups(prev => [...prev, newGroup]);
    setUsers(prev => prev.map(u => u.id === mentorId ? { ...u, groupId: newId } : u));
    return newId;
  };

  const addMemberToGroup = (groupId: string, userId: string) => {
    // Persist to backend
    addMemberToGroupAPI(groupId, userId).then(res => {
      if (res) console.log('[DataContext] Member added in backend');
    });

    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const user = users.find(u => u.id === userId);
        if (!user || g.members.some(m => m.id === userId)) return g;
        const newMembers = [...g.members, user];
        return { ...g, members: newMembers, memberCount: g.mentors.length + newMembers.length };
      }
      return g;
    }));
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, groupId } : u));
  };

  const removeMemberFromGroup = (groupId: string, userId: string) => {
    // Persist to backend
    removeMemberFromGroupAPI(groupId, userId).then(success => {
      if (success) console.log('[DataContext] Member removed in backend');
    });

    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const newMembers = g.members.filter(m => m.id !== userId);
        return { ...g, members: newMembers, memberCount: g.mentors.length + newMembers.length };
      }
      return g;
    }));
  };

  const addMentorToGroup = (groupId: string, mentorId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const mentor = users.find(u => u.id === mentorId);
        if (!mentor || g.mentors.some(m => m.id === mentorId)) return g;
        return { ...g, mentors: [...g.mentors, mentor], memberCount: g.mentors.length + 1 + g.members.length };
      }
      return g;
    }));
  };

  const createGroupEvent = (event: Partial<AppEvent>, groupId: string, mentorId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Persist to backend
    createGroupEventAPI({
      title: event.name || 'Yeni Etkinlik',
      description: event.description,
      startTime: event.date || new Date().toISOString(),
      location: event.location,
      groupId: groupId,
      createdBy: mentorId
    }).then(apiEvt => {
      if (apiEvt) console.log('[DataContext] Event created in backend:', apiEvt.id);
    });

    const newEvent: AppEvent = {
      id: `evt-${Date.now()}`,
      name: event.name || 'Yeni Etkinlik',
      date: event.date || new Date().toISOString(),
      description: event.description || '',
      groupId,
      createdBy: mentorId,
      participants: [...group.members, ...group.mentors],
      attendedParticipants: [],
      location: event.location,
      speakers: event.speakers,
      agenda: event.agenda,
      comments: [], questions: [], surveys: [],
    };
    setEvents(prev => [...prev, newEvent]);

    const mentor = users.find(u => u.id === mentorId);
    const notifPost: Post = {
      id: `post-evt-${Date.now()}`,
      objectType: 'text_post',
      createdBy: mentorId,
      authorName: mentor?.name || 'Mentör',
      createdAt: new Date().toISOString(),
      groupId,
      scope: 'group',
      isSystem: true,
      isPinned: true,
      uiPayload: {
        text: `📅 Yeni Etkinlik: "${newEvent.name}" — ${new Date(newEvent.date).toLocaleDateString('tr-TR')} tarihinde ${newEvent.location || 'belirtilen konumda'}.`,
        allowComments: true,
      },
    };
    setPosts(prev => [notifPost, ...prev]);
  };

  const takeAttendance = async (eventId: string, userIds: string[]) => {
    try {
      await Promise.all(userIds.map(async (uid) => {
        const checkin = await quickCheckinAPI(uid, eventId);
        if (!checkin?.id) {
          throw new Error(`quickCheckin failed for user ${uid}`);
        }
      }));

      setEvents(prev => prev.map(e => {
        if (e.id === eventId) {
          const current = new Set(e.attendedParticipants || []);
          userIds.forEach(id => current.add(id));
          return { ...e, attendedParticipants: Array.from(current) };
        }
        return e;
      }));
      console.log(`[DataContext] Attendance taken for ${userIds.length} users in event ${eventId}`);
    } catch (error) {
      console.error('[DataContext] Error taking attendance:', error);
    }
  };

  const createSystemPost = async (groupId: string | null, post: Omit<Post, 'id' | 'createdAt' | 'isSystem' | 'isPinned' | 'scope'>, pinned = true) => {
    const tempId = `post-sys-${Date.now()}`;
    const newPost: Post = {
      ...post,
      id: tempId,
      createdAt: new Date().toISOString(),
      isSystem: true,
      isPinned: pinned,
      scope: groupId ? 'group' : 'global',
      groupId: groupId || undefined,
    };
    setPosts(prev => [newPost, ...prev]);

    // Backend'e kaydet
    try {
      const contentText = post.uiPayload?.text || '';
      const savedPost = await createFeedPostAPI({
        authorId: post.createdBy,
        contentText: contentText || '(Sistem Gönderisi)',
        scope: groupId ? 'group' : 'global',
        postType: (post.objectType === 'text_post' || !post.objectType) ? 'text' : post.objectType,
        groupId: groupId || undefined,
        isSystem: true,
        isPinned: pinned,
        metadata: post.uiPayload,
      });
      if (savedPost?.id) {
        // Gerçek ID ile güncelle
        setPosts(prev => prev.map(p => p.id === tempId ? { ...p, id: savedPost.id } : p));
        console.log('[DataContext] System post saved to backend:', savedPost.id);
      }
    } catch (err) {
      console.error('[DataContext] System post backend kayıt hatası:', err);
      // Local state'te kalır, kullanıcıya hata gösterme
    }
  };

  const submitPostEngagement = async (postId: string, action: 'liked' | 'answered' | 'bookmarked' | 'unliked', responseData?: any) => {
    // Current user context
    const storedAuth = localStorage.getItem('v_rag_user');
    if (!storedAuth) return;
    const authUser = JSON.parse(storedAuth);
    const existingPost = posts.find(p => p.id === postId);
    const currentLikes = existingPost?.reactions?.['👍'] || [];
    const isCurrentlyLiked = currentLikes.includes(authUser.id);

    try {
      if (isUuid(postId) && action !== 'unliked') {
        const engagementResult = await submitEngagement({
          userId: authUser.id,
          objectId: postId,
          objectType: 'feed_post',
          nature: 'explicit',
          action,
          responseData,
          behavioralMetrics: { timestamp: Date.now() },
          seenAt: new Date().toISOString(),
          interactedAt: new Date().toISOString()
        });

        if (!engagementResult) {
          throw new Error(`Engagement mutation failed for action: ${action}`);
        }
      }

      if (isUuid(postId) && (action === 'liked' || action === 'unliked')) {
        if (action === 'liked' && !isCurrentlyLiked) {
          const reactionResult = await addReactionAPI(postId, authUser.id, '👍');
          if (!reactionResult) {
            throw new Error('addReaction mutation failed');
          }
        } else if (action === 'unliked' && isCurrentlyLiked) {
          const reactionResult = await removeReactionAPI(postId, authUser.id, '👍');
          if (!reactionResult) {
            throw new Error('removeReaction mutation failed');
          }
        }
      }

      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const reactions = p.reactions || {};
        const likedUsers = reactions['👍'] || [];
        const nextLikedUsers =
          action === 'unliked'
            ? likedUsers.filter(id => id !== authUser.id)
            : action === 'liked'
              ? (likedUsers.includes(authUser.id) ? likedUsers : [...likedUsers, authUser.id])
              : likedUsers;
        return { ...p, reactions: { ...reactions, '👍': nextLikedUsers } };
      }));

      console.log(`[DataContext] Engagement submitted: ${action} for ${postId}`);
    } catch (err) {
      console.error('[DataContext] Engagement submission failed:', err);
    }
  };

  const addPostComment = async (postId: string, text: string) => {
    const storedAuth = localStorage.getItem('v_rag_user');
    if (!storedAuth) return;
    const authUser = JSON.parse(storedAuth);
    const authorName = authUser.cognitiveProfile?.name || authUser.name || 'Katılımcı';

    try {
      const savedPost = isUuid(postId)
        ? await addCommentAPI(postId, authUser.id, authorName, text)
        : null;

      if (isUuid(postId) && !savedPost?.id) {
        throw new Error('addComment mutation failed');
      }

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const metadata = savedPost?.metadata || p.uiPayload || {};
          const comments = metadata.comments || [];
          const alreadyHasComment = comments.some((comment: any) =>
            comment.text === text && comment.authorName === authorName
          );
          return {
            ...p,
            uiPayload: {
              ...metadata,
              comments: alreadyHasComment ? comments : [...comments, {
                id: Math.random().toString(),
                text,
                authorName,
                createdAt: new Date().toISOString()
              }]
            }
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('[DataContext] Comment failed:', err);
    }
  };

  // --- Helpers ---
  const getGroupById = (groupId: string) => groups.find(g => g.id === groupId);
  const getUserGroups = (userId: string) => groups.filter(g => g.members.some(m => m.id === userId) || g.mentors.some(m => m.id === userId));
  const getGroupMentors = (groupId: string) => groups.find(g => g.id === groupId)?.mentors || [];

  return (
    <DataContext.Provider value={{
      users, groups, posts, events,
      addPost, addEvent, registerForEvent, addEventComment, addEventQuestion,
      voteQuestion, addEventSurvey, submitSurveyResponse, markAttendance,
      createGroup, addMemberToGroup, removeMemberFromGroup, addMentorToGroup,
      createGroupEvent, takeAttendance, createSystemPost,
      getGroupById, getUserGroups, getGroupMentors,
      submitPostEngagement, addPostComment
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
