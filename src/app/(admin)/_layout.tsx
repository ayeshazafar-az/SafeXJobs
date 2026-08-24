import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function AdminLayout() {
    const { theme } = useTheme();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.card,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.textSecondary,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Overview',
                    tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="jobs"
                options={{
                    title: 'Jobs',
                    tabBarIcon: ({ color }) => <Ionicons name="briefcase" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
                }}
            />
            {/* Hidden screens (accessible via routing from Dashboard & Settings but not tab bar) */}
            <Tabs.Screen name="applications" options={{ href: null }} />
            <Tabs.Screen name="chats" options={{ href: null }} />
            <Tabs.Screen name="categories" options={{ href: null }} />
            <Tabs.Screen name="locations" options={{ href: null }} />
        </Tabs>
    );
}
