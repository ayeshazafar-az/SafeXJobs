import { adminSupabase } from '@/lib/adminSupabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function AdminApplicationsMonitor() {
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
            <Text style={styles.jobText}>Applied to: <Text style={{ color: '#fff' }}>{item.job?.title}</Text> at {item.job?.profiles?.company_name}</Text>
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
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    candidateName: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', flex: 1 },
    badge: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: '#60a5fa', fontSize: 12, fontWeight: 'bold' },
    jobText: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
    timestamp: { color: '#64748b', fontSize: 11 },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 }
});
