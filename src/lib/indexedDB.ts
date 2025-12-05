import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    createdAt: string;
    sessionId: string;
}

interface User {
    id?: string;
    username?: string;
    email?: string;
}

interface SessionData {
    id: string;
    persona?: {
        id?: string;
        name?: string;
        avatar?: string;
    };
    user?: User;
    bgImage?: string;
    bgMode?: string;
    personaId?: string;
    updatedAt: string;
}

interface AuraChatDB extends DBSchema {
    messages: {
        key: string;
        value: Message;
        indexes: { 'by-session': string };
    };
    sessions: {
        key: string;
        value: SessionData;
    };
}

const DB_NAME = 'aura_chat_db';
const STORE_NAME = 'messages';
const SESSION_STORE = 'sessions';

async function getDB(): Promise<IDBPDatabase<AuraChatDB>> {
    return openDB<AuraChatDB>(DB_NAME, 2, {
        upgrade(db, oldVersion) {
            // Create messages store
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('by-session', 'sessionId');
            }

            // Create sessions store (v2)
            if (oldVersion < 2 && !db.objectStoreNames.contains(SESSION_STORE)) {
                db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
            }
        },
    });
}

export async function saveMessages(messages: Message[]) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await Promise.all(messages.map(msg => store.put(msg)));
    await tx.done;
}

export async function getMessages(sessionId: string): Promise<Message[]> {
    const db = await getDB();
    const messages = await db.getAllFromIndex(STORE_NAME, 'by-session', sessionId);
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function saveSession(session: SessionData) {
    const db = await getDB();
    await db.put(SESSION_STORE, {
        ...session,
        updatedAt: new Date().toISOString()
    });
}

export async function getSession(sessionId: string): Promise<SessionData | undefined> {
    const db = await getDB();
    return await db.get(SESSION_STORE, sessionId);
}

export async function clearSessionMessages(sessionId: string) {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by-session');

    let cursor = await index.openCursor(IDBKeyRange.only(sessionId));

    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
}

export async function deleteMessage(messageId: string) {
    const db = await getDB();
    await db.delete(STORE_NAME, messageId);
}
