import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AdminUsersScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Management</Text>
                <Text style={styles.subtitle}>Supervise candidates, companies, and managers.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.emptyState}>
                    <Ionicons name="people-circle" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>User Database Syncing</Text>
                    <Text style={styles.emptyText}>
                        This module will allow you to search, view profiles, and block/suspend any rogue Candidates or Hiring Managers seamlessly across the platform.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155'
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#94a3b8' },
    content: { padding: 24, alignItems: 'center', justifyContent: 'center', height: '100%' },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginTop: 20 },
    emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 12, lineHeight: 22 }
});
