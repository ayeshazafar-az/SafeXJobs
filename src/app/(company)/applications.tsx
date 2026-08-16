import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompanyApplicationsScreen() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchApplications = async () => {
        if (!user) return;

        // Fetch applications matching the company's posted jobs
        // Using !inner to only get applications for jobs that belong to THIS company
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                jobs!inner (
                    id,
                    title,
                    company_id
                ),
                profiles!applications_candidate_id_fkey (
                    full_name,
                    career_objective,
                    skills,
                    resume_url
                )
            `)
            .eq('jobs.company_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching company apps:", error);
        } else if (data) {
            setApplications(data);
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

    const updateStatus = async (appId: string, newStatus: string) => {
        setUpdatingId(appId);
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus })
            .eq('id', appId);

        setUpdatingId(null);

        if (error) {
            Alert.alert('Update Failed', error.message);
        } else {
            // Update local state for immediate feedback
            setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: newStatus } : app));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Shortlisted': return '#a78bfa';
            case 'Interview': return '#fb923c';
            case 'Hired': return '#10b981';
            case 'Rejected': return '#f43f5e';
            default: return '#94a3b8'; // Pending
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Candidate Review</Text>
                <Text style={styles.subtitle}>Evaluate incoming applications for your active listings.</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
                ) : applications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>No applications received yet.</Text>
                        <Text style={styles.emptySubText}>When a candidate applies to your jobs, they will appear here for review.</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const candidate = app.profiles;
                        const job = app.jobs;
                        const statusColor = getStatusColor(app.status);

                        return (
                            <View key={app.id} style={styles.appCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {(candidate?.full_name || 'U')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.candidateName}>{candidate?.full_name || 'Anonymous Candidate'}</Text>
                                        <Text style={styles.jobTitleApplied}>Applied for: <Text style={{ color: '#f8fafc' }}>{job?.title}</Text></Text>
                                        <Text style={styles.timeText}>Applied {new Date(app.created_at).toLocaleDateString()}</Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>{app.status}</Text>
                                    </View>
                                </View>

                                {candidate?.career_objective ? (
                                    <View style={styles.bioBox}>
                                        <Text style={styles.bioText} numberOfLines={2}>"{candidate.career_objective}"</Text>
                                    </View>
                                ) : null}

                                <View style={styles.skillsWrapper}>
                                    {Array.isArray(candidate?.skills) && candidate.skills.slice(0, 4).map((skill: string, index: number) => (
                                        <View key={index} style={styles.skillTag}>
                                            <Text style={styles.skillText}>{skill}</Text>
                                        </View>
                                    ))}
                                    {(Array.isArray(candidate?.skills) && candidate.skills.length > 4) && (
                                        <Text style={styles.moreSkillsText}>+{candidate.skills.length - 4} more</Text>
                                    )}
                                </View>

                                <View style={styles.actionsDivider} />

                                <Text style={styles.actionPrompt}>Update Application Status:</Text>
                                <View style={styles.actionsRow}>
                                    {updatingId === app.id ? (
                                        <ActivityIndicator color="#3b82f6" style={{ marginVertical: 10 }} />
                                    ) : (
                                        <>
                                            {app.status === 'Pending' && (
                                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#a78bfa' }]} onPress={() => updateStatus(app.id, 'Shortlisted')}>
                                                    <Text style={styles.actionBtnText}>Shortlist</Text>
                                                </TouchableOpacity>
                                            )}

                                            {(app.status === 'Pending' || app.status === 'Shortlisted') && (
                                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fb923c' }]} onPress={() => updateStatus(app.id, 'Interview')}>
                                                    <Text style={styles.actionBtnText}>Interview</Text>
                                                </TouchableOpacity>
                                            )}

                                            {(app.status === 'Interview' || app.status === 'Shortlisted') && (
                                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => updateStatus(app.id, 'Hired')}>
                                                    <Text style={styles.actionBtnText}>Hire</Text>
                                                </TouchableOpacity>
                                            )}

                                            {app.status !== 'Rejected' && app.status !== 'Hired' && (
                                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#f43f5e' }]} onPress={() => updateStatus(app.id, 'Rejected')}>
                                                    <Text style={[styles.actionBtnText, { color: '#f43f5e' }]}>Reject</Text>
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    )}
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
        alignItems: 'flex-start',
        marginBottom: 16
    },
    avatarPlaceholder: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        alignItems: 'center', justifyContent: 'center'
    },
    avatarText: { color: '#38bdf8', fontSize: 20, fontWeight: 'bold' },

    candidateName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    jobTitleApplied: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 2 },
    timeText: { color: '#475569', fontSize: 11 },

    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
        position: 'absolute', right: 0, top: 0
    },
    statusText: { fontSize: 11, fontWeight: 'bold' },

    bioBox: {
        backgroundColor: '#0f172a',
        padding: 12, borderRadius: 8,
        borderLeftWidth: 3, borderLeftColor: '#334155',
        marginBottom: 16
    },
    bioText: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },

    skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    skillTag: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    skillText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
    moreSkillsText: { color: '#64748b', fontSize: 11, fontWeight: '600', alignSelf: 'center' },

    actionsDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
    actionPrompt: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 10 },
    actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    actionBtn: {
        flex: 1,
        minWidth: 80,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' }
});
