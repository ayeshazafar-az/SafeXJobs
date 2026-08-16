import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CandidateApplicationsScreen() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchApplications = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                jobs (
                    title,
                    location,
                    profiles!jobs_company_id_fkey (
                        company_name,
                        full_name
                    )
                )
            `)
            .eq('candidate_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setApplications(data);
        } else if (error) {
            console.error("Error fetching applications:", error);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchApplications();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchApplications();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Shortlisted': return '#a78bfa';
            case 'Interview': return '#fb923c';
            case 'Hired': return '#10b981';
            case 'Rejected': return '#f43f5e';
            default: return '#38bdf8'; // Applied / Pending
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Shortlisted': return 'star-outline';
            case 'Interview': return 'chatbubbles-outline';
            case 'Hired': return 'checkmark-circle-outline';
            case 'Rejected': return 'close-circle-outline';
            default: return 'time-outline'; // Applied / Pending
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Applications</Text>
                <Text style={styles.subtitle}>Track your recruitment progress in real-time.</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
                ) : applications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>You haven't applied to any jobs yet.</Text>
                        <Text style={styles.emptySubText}>Head over to the Find Jobs tab to start your journey!</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const job = app.jobs;
                        const companyName = job?.profiles?.company_name || job?.profiles?.full_name || 'Unknown Company';
                        const statusColor = getStatusColor(app.status);

                        return (
                            <View key={app.id} style={styles.appCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.jobTitle} numberOfLines={1}>{job?.title || 'Unknown Role'}</Text>
                                        <Text style={styles.companyName}>{companyName}</Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                                        <Ionicons name={getStatusIcon(app.status)} size={14} color={statusColor} />
                                        <Text style={[styles.statusText, { color: statusColor }]}>
                                            {app.status === 'Pending' ? 'Applying' : app.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.progressTrack}>
                                    <View style={styles.progressStep}>
                                        <View style={[styles.stepDot, { backgroundColor: '#38bdf8' }]} />
                                        <Text style={[styles.stepLabel, { color: '#38bdf8' }]}>Applied</Text>
                                    </View>

                                    <View style={[styles.stepLine, app.status !== 'Pending' && { backgroundColor: statusColor }]} />

                                    <View style={styles.progressStep}>
                                        <View style={[styles.stepDot, app.status !== 'Pending' ? { backgroundColor: statusColor } : {}]} />
                                        <Text style={[styles.stepLabel, app.status !== 'Pending' && { color: statusColor }]}>
                                            {app.status === 'Pending' ? 'Reviewing' : app.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.footerText}>
                                        Applied {new Date(app.created_at).toLocaleDateString()}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color="#475569" />
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },

    listContent: { padding: 20, paddingBottom: 100 },

    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

    appCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1, borderColor: '#334155'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    jobTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    companyName: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1
    },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    progressTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0f172a',
        padding: 16, borderRadius: 12,
        marginBottom: 16
    },
    progressStep: { alignItems: 'center', gap: 8, zIndex: 2 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155' },
    stepLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
    stepLine: {
        flex: 1, height: 2,
        backgroundColor: '#334155',
        marginHorizontal: 12,
        position: 'absolute', left: 40, right: 40, top: 21, zIndex: 1
    },

    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16
    },
    footerText: { color: '#64748b', fontSize: 12 }
});
