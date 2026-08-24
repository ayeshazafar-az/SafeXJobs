import { useTheme } from '@/lib/ThemeContext';
import { adminSupabase } from '@/lib/adminSupabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function AdminApplicationsMonitor() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApps = async () => {
            setLoading(true);
            const { data } = await adminSupabase
                .from('applications')
                .select(`
                    *,
                    candidate:profiles!applications_candidate_id_fkey(full_name),
                    job:jobs(title, profiles!jobs_company_id_fkey(company_name))
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) setApplications(data);
            setLoading(false);
        };
        fetchApps();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.candidateName}>{item.candidate?.full_name || 'Unknown Candidate'}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.jobText}>Applied to: <Text style={{ color: theme.text }}>{item.job?.title}</Text> at {item.job?.profiles?.company_name}</Text>
            <Text style={styles.timestamp}>Applied: {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Global Applications</Text>
                <Text style={styles.subtitle}>Monitor platform hiring activity.</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={applications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No applications found.</Text>}
                />
            )}
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    card: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    candidateName: { color: theme.text, fontSize: 16, fontWeight: 'bold', flex: 1 },
    badge: { backgroundColor: `${theme.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: theme.primary, fontSize: 12, fontWeight: 'bold' },
    jobText: { color: theme.textSecondary, fontSize: 14, marginBottom: 8 },
    timestamp: { color: theme.textSecondary, fontSize: 11 },
    emptyText: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 }
});
