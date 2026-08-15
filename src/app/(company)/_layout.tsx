import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function CompanyLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#f59e0b',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: {
                    backgroundColor: '#0f172a',
                    borderTopColor: '#1e293b',
                    borderTopWidth: 1,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600'
                }
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="post-job"
                options={{
                    title: 'Post Job',
                    tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="applications"
                options={{
                    title: 'Review',
                    tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Company',
                    tabBarIcon: ({ color }) => <Ionicons name="business" size={24} color={color} />
                }}
            />
        </Tabs>
    );
}
