'use client';

import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/screens/HomeScreen';
import ChatScreen from '@/screens/ChatScreen';
import ChatSettingsScreen from '@/screens/ChatSettingsScreen';
import ChatMemoryScreen from '@/screens/ChatMemoryScreen';
import MomentsScreen from '@/screens/MomentsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import EditProfileScreen from '@/screens/EditProfileScreen';
import ApiSettingsScreen from '@/screens/ApiSettingsScreen';
import BubbleSettingsScreen from '@/screens/BubbleSettingsScreen';
import PersonaManagementScreen from '@/screens/PersonaManagementScreen';
import NewPersonaScreen from '@/screens/NewPersonaScreen';
import EditPersonaScreen from '@/screens/EditPersonaScreen';

// Wrapper to provide location to BottomNav and handle mobile back logic
function AppContent() {
    const location = useLocation();
    const isInChat = location.pathname.startsWith('/chat/');

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-warm)'
        }}>
            {/* 主内容区域 */}
            <div style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                paddingBottom: isInChat ? 0 : 'calc(50px + env(safe-area-inset-bottom, 0px))'
            }}>
                <Routes>
                    <Route path="/" element={<HomeScreen />} />
                    <Route path="/chat/:id" element={<ChatScreen />} />
                    <Route path="/chat/:id/settings" element={<ChatSettingsScreen />} />
                    <Route path="/chat/:id/memory" element={<ChatMemoryScreen />} />

                    <Route path="/moments" element={<MomentsScreen />} />
                    <Route path="/moments/notifications" element={<NotificationsScreen />} />

                    <Route path="/me" element={<ProfileScreen />} />
                    <Route path="/me/edit" element={<EditProfileScreen />} />
                    <Route path="/me/settings" element={<SettingsScreen />} />
                    <Route path="/me/settings/api" element={<ApiSettingsScreen />} />
                    <Route path="/me/settings/bubble" element={<BubbleSettingsScreen />} />
                    <Route path="/me/settings/personas" element={<PersonaManagementScreen />} />

                    <Route path="/personas" element={<Navigate to="/" replace />} />
                    <Route path="/personas/new" element={<NewPersonaScreen />} />
                    <Route path="/personas/:id/edit" element={<EditPersonaScreen />} />
                    {/* Add other routes as we migrate them, for now simple 404 or redirect */}
                    <Route path="*" element={<div style={{ padding: 20 }}>Page not found</div>} />
                </Routes>
            </div>

            {/* 底部导航栏 - 只在非聊天页面显示 */}
            {!isInChat && <BottomNav />}
        </div>
    );
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
