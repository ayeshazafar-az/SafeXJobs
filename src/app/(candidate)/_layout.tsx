import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function CandidateLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: '#1e293b',
                    borderTopWidth: 1,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600'
                }
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="jobs"
                options={{
                    title: 'Find Jobs',
                    tabBarIcon: ({ color }) => <Ionicons name="briefcase" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />
                }}
            />
        </Tabs>
    );
}
