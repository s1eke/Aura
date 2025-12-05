import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

// Types
interface Message {
    id: string;
    content: string;
    role: string;
    createdAt: string;
    sessionId?: string;
    isBlocked?: boolean;
    status?: string;
}

interface Persona {
    id: string;
    name: string;
    avatar: string | null | undefined;
    greeting?: string;
}

interface ChatSession {
    id: string;
    persona: Persona;
    messages: Message[];
    updatedAt: string;
    isPinned: boolean;
}

interface Moment {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        username: string;
        avatar?: string;
        email?: string;
    };
    images: Array<{
        id: string;
        image: {
            id: string;
            filepath: string;
            filename: string;
        };
    }>;
    likes: Array<{
        id: string;
        user?: { username: string };
        persona?: { name: string };
    }>;
    comments: Array<{
        id: string;
        content: string;
        user?: { id: string; username: string };
        persona?: { id: string; name: string };
    }>;
}

interface Notification {
    id: string;
    type: string;
    content?: string;
    createdAt: string;
    isRead: boolean;
    sourceUser?: {
        id: string;
        username: string;
        avatar?: string;
    };
    sourcePersona?: Persona;
    moment?: Moment;
}

interface Counts {
    unreadNotifications: number;
}

/**
 * Lightweight polling for notification unread count
 * This is the primary polling mechanism to reduce data transfer
 * Polls every 5 seconds for notification counts (only when online)
 */
export function useCounts() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            // Check if online before making request
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                throw new Error('Offline');
            }

            const response = await fetch('/api/notifications/unread-count');
            if (!response.ok) {
                throw new Error('Failed to fetch unread count');
            }
            const data = await response.json();
            return data as Counts;
        },
        refetchInterval: () => {
            // Only poll if online
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                return false; // Disable polling when offline
            }
            return 5000; // Poll every 5 seconds when online
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true, // Refetch when network reconnects
        staleTime: 3000,
        retry: false, // Don't retry on failure to avoid spamming offline requests
    });
}

/**
 * Fetch and cache chat sessions
 * Data is cached for 1 minute and refreshed in background
 */
export function useSessions() {
    return useQuery({
        queryKey: queryKeys.sessions,
        queryFn: async () => {
            const response = await fetch('/api/sessions');
            if (!response.ok) {
                throw new Error('Failed to fetch sessions');
            }
            const data = await response.json();

            // Sort sessions: pinned first, then by update time
            const sortedSessions = (data.sessions || []).sort((a: ChatSession, b: ChatSession) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });

            return sortedSessions as ChatSession[];
        },
        refetchOnWindowFocus: true, // Refresh when returning to the app
        refetchOnMount: true, // Refresh when component mounts
        staleTime: 30000, // Consider data stale after 30 seconds
    });
}

/**
 * Fetch and cache moments feed
 * Refreshed automatically when notifications are updated
 */
export function useMoments() {
    return useQuery({
        queryKey: queryKeys.moments,
        queryFn: async () => {
            const response = await fetch('/api/moments');
            if (!response.ok) {
                throw new Error('Failed to fetch moments');
            }
            const data = await response.json();
            return data.moments as Moment[];
        },
        refetchOnWindowFocus: true, // Refresh when user returns to the app
        refetchOnMount: true, // Refresh when component mounts
        staleTime: 5000, // Consider data stale after 5 seconds
    });
}

/**
 * Fetch and cache notifications
 * Data fetched on-demand when entering notifications page
 */
export function useNotifications() {
    return useQuery({
        queryKey: queryKeys.notifications,
        queryFn: async () => {
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            const data = await response.json();
            return data.notifications as Notification[];
        },
        refetchOnWindowFocus: true, // Refresh when user returns to the app
        refetchOnMount: true, // Refresh when component mounts
        staleTime: 30000, // Consider data stale after 30 seconds
    });
}

/**
 * Fetch and cache available personas
 */
export function usePersonas() {
    return useQuery({
        queryKey: queryKeys.personas,
        queryFn: async () => {
            const response = await fetch('/api/personas');
            if (!response.ok) {
                throw new Error('Failed to fetch personas');
            }
            const data = await response.json();
            return data.personas as Persona[];
        },
    });
}

/**
 * Fetch and cache messages for a specific session
 */
export function useMessages(sessionId: string) {
    return useQuery({
        queryKey: queryKeys.messages(sessionId),
        queryFn: async () => {
            const response = await fetch(`/api/sessions/${sessionId}/messages`);
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const data = await response.json();
            return data.messages as Message[];
        },
        enabled: !!sessionId,
    });
}

/**
 * Mark notification as read
 * Automatically invalidates notifications query to refresh the list
 */
export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate and refetch notifications
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
            // Invalidate unread count to update badges immediately
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        },
    });
}

/**
 * Create a new moment
 * Automatically invalidates moments query to show the new moment
 */
export function useCreateMoment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch('/api/moments', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Failed to create moment');
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate moments to show the new one
            queryClient.invalidateQueries({ queryKey: queryKeys.moments });
        },
    });
}

/**
 * Like a moment
 * Uses optimistic updates for instant UI feedback
 */
export function useLikeMoment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ momentId, personaId }: { momentId: string; personaId: string }) => {
            const response = await fetch(`/api/moments/${momentId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personaId }),
            });
            if (!response.ok) {
                throw new Error('Failed to like moment');
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate moments to show updated like count
            queryClient.invalidateQueries({ queryKey: queryKeys.moments });
        },
    });
}

/**
 * Comment on a moment
 * Automatically invalidates moments query to show the new comment
 */
export function useCommentOnMoment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ momentId, content }: { momentId: string; content: string }) => {
            const response = await fetch(`/api/moments/${momentId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (!response.ok) {
                throw new Error('Failed to comment on moment');
            }
            return response.json();
        },
        onSuccess: () => {
            // Invalidate moments to show the new comment
            queryClient.invalidateQueries({ queryKey: queryKeys.moments });
        },
    });
}

/**
 * Fetch and cache user profile/settings
 * Includes momentMode and other user preferences
 */
export function useUserProfile() {
    return useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            const response = await fetch('/api/user/profile');
            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }
            return response.json();
        },
    });
}

/**
 * Update user profile settings
 * Automatically invalidates user profile query
 */
export function useUpdateUserProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                throw new Error('Failed to update user profile');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        },
    });
}

/**
 * Fetch and cache a specific chat session
 */
export function useChatSession(sessionId: string) {
    return useQuery({
        queryKey: queryKeys.session(sessionId),
        queryFn: async () => {
            const response = await fetch(`/api/sessions/${sessionId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch session');
            }
            const data = await response.json();
            return data.session;
        },
        enabled: !!sessionId,
    });
}

/**
 * Update chat session settings
 * Automatically invalidates session and sessions queries
 */
export function useUpdateChatSession(sessionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const response = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                throw new Error('Failed to update session');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
        },
    });
}

/**
 * Fetch session messages with offline support
 * Uses dual-layer caching: TanStack Query (memory) + IndexedDB (persistent)
 * 
 * Behavior:
 * - Online: Fetch from API, cache to both layers (including session metadata)
 * - Offline: Load from IndexedDB cache (messages + session)
 * - Network error: Automatically fall back to IndexedDB
 * - No cache + offline: Return empty data with minimal session
 */
export function useSessionMessages(sessionId: string) {
    return useQuery({
        queryKey: queryKeys.messages(sessionId),
        queryFn: async () => {
            // Import IndexedDB functions dynamically
            const { getMessages, saveMessages, getSession, saveSession } = await import('@/lib/indexedDB');

            // Check if offline first - load from cache immediately
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                console.log('[useSessionMessages] Offline - loading from IndexedDB');
                const cachedMessages = await getMessages(sessionId);
                const cachedSession = await getSession(sessionId);

                return {
                    messages: cachedMessages,
                    hasMore: false,
                    nextCursor: null,
                    session: cachedSession || {
                        id: sessionId,
                        persona: { name: '离线模式' },
                        updatedAt: new Date().toISOString()
                    }
                };
            }

            try {
                // Try to fetch from API (only when online)
                const response = await fetch(`/api/sessions/${sessionId}?limit=20`);

                if (response.ok) {
                    const data = await response.json();
                    const messages = data.session?.messages || [];

                    // Save messages to IndexedDB
                    if (messages.length > 0) {
                        const messagesWithSessionId = messages.map((m: Message) => ({
                            ...m,
                            sessionId,
                            status: m.isBlocked ? 'blocked' : (m.status || 'sent')
                        }));
                        await saveMessages(messagesWithSessionId);
                    }

                    // Save session metadata to IndexedDB
                    if (data.session) {
                        await saveSession({
                            id: sessionId,
                            persona: data.session.persona,
                            user: data.session.user,
                            bgImage: data.session.bgImage,
                            bgMode: data.session.bgMode,
                            personaId: data.session.personaId,
                            updatedAt: new Date().toISOString()
                        });
                    }

                    // Return processed messages with status field
                    const processedMessages = messages.map((m: Message) => ({
                        ...m,
                        sessionId,
                        status: m.isBlocked ? 'blocked' : (m.status || 'sent')
                    }));

                    return {
                        messages: processedMessages,
                        hasMore: data.hasMore,
                        nextCursor: data.nextCursor,
                        session: data.session
                    };
                }

                // If API returns error, fall back to cache
                console.log('[useSessionMessages] API error, falling back to IndexedDB');
                const cachedMessages = await getMessages(sessionId);
                const cachedSession = await getSession(sessionId);

                // Return cached data or empty with minimal session
                return {
                    messages: cachedMessages,
                    hasMore: false,
                    nextCursor: null,
                    session: cachedSession || {
                        id: sessionId,
                        persona: { name: '离线模式' },
                        updatedAt: new Date().toISOString()
                    }
                };

            } catch (error) {
                // Network error or other failure - load from IndexedDB
                console.log('[useSessionMessages] Network error, loading from IndexedDB:', error);
                const cachedMessages = await getMessages(sessionId);
                const cachedSession = await getSession(sessionId);

                // Return cached data or empty with minimal session
                return {
                    messages: cachedMessages,
                    hasMore: false,
                    nextCursor: null,
                    session: cachedSession || {
                        id: sessionId,
                        persona: { name: '离线模式' },
                        updatedAt: new Date().toISOString()
                    }
                };
            }
        },
        enabled: !!sessionId,
        gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory cache longer for offline
        staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
        retry: false, // Don't retry, fall back to cache immediately
        refetchOnWindowFocus: true, // Refresh when user returns to app
        refetchOnReconnect: true, // Refresh when network reconnects
        networkMode: 'offlineFirst', // Prioritize cache when offline
    });
}
