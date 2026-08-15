import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AdminSettingsScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Platform Settings</Text>
                <Text style={styles.subtitle}>Configure locations, view reports, handle chat moderation.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.emptyState}>
                    <Ionicons name="settings" size={80} color="#334155" />
                    <Text style={styles.emptyTitle}>System Configuration</Text>
                    <Text style={styles.emptyText}>
                        Configure global locations, handle user complaint reports, and adjust strict overarching platform security settings in this zone.
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
