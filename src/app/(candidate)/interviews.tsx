import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CandidateInterviewsScreen() {
    const { user } = useAuth();
    const [interviews, setInterviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchInterviews = async () => {
        if (!user) return;

        // Fetch interviews tied to this candidate's applications
        const { data, error } = await supabase
            .from('interviews')
            .select(`
                *,
                applications!inner (
                    candidate_id,
                    jobs (
                        title,
                        profiles!jobs_company_id_fkey (company_name)
                    )
                )
            `)
            .eq('applications.candidate_id', user.id)
            .order('interview_date', { ascending: true });

        if (data) setInterviews(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchInterviews();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInterviews();
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Interviews</Text>
                <Text style={styles.subtitle}>Your scheduled meetings with hiring managers.</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
            >
                {interviews.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>No upcoming interviews.</Text>
                        <Text style={styles.emptySubText}>When a hiring manager schedules an interview for a shortlisted application, it will appear here.</Text>
                    </View>
                ) : (
                    interviews.map(interview => {
                        const job = interview.applications?.jobs;
                        const dateObj = new Date(interview.interview_date);
                        const isPast = dateObj < new Date() && interview.status === 'Scheduled';

                        return (
                            <View key={interview.id} style={styles.interviewCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.calendarIconBg}>
                                        <Text style={styles.calMonth}>{dateObj.toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                                        <Text style={styles.calDay}>{dateObj.getDate()}</Text>
                                    </View>

                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={styles.jobTitle}>{job?.title}</Text>
                                        <Text style={styles.companyName}>{job?.profiles?.company_name}</Text>
                                    </View>

                                    <View style={[styles.statusBadge, interview.status === 'Scheduled' && !isPast ? { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' } : { backgroundColor: 'rgba(148, 163, 184, 0.1)', borderColor: '#94a3b8' }]}>
                                        <Text style={[styles.statusText, interview.status === 'Scheduled' && !isPast ? { color: '#38bdf8' } : { color: '#94a3b8' }]}>
                                            {isPast ? 'Pending Feedback' : interview.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailsBox}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={16} color="#64748b" />
                                        <Text style={styles.detailText}>
                                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Ionicons name={interview.interview_type?.toLowerCase() === 'online' ? 'videocam-outline' : 'location-outline'} size={16} color="#64748b" />
                                        <Text style={styles.detailText}>{interview.interview_type || 'Online'}</Text>
                                    </View>
                                </View>

                                {(interview.meeting_link || interview.location) ? (
                                    <TouchableOpacity style={styles.actionBtn}>
                                        <Ionicons name="link-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.actionBtnText}>
                                            {interview.interview_type?.toLowerCase() === 'online' ? 'Join Online Meeting' : 'View Location Directions'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.pendingLinkBox}>
                                        <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Meeting link will be provided shortly</Text>
                                    </View>
                                )}
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

    listContent: { padding: 20 },
    emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
    emptyText: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

    interviewCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16, padding: 20,
        marginBottom: 16,
        borderWidth: 1, borderColor: '#334155'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },

    calendarIconBg: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        width: 54, height: 54,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#334155',
    },
    calMonth: { color: '#f43f5e', fontSize: 11, fontWeight: '900' },
    calDay: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },

    jobTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    companyName: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: 'bold' },

    detailsBox: {
        backgroundColor: '#0f172a',
        padding: 12, borderRadius: 8,
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        borderLeftWidth: 3, borderLeftColor: '#3b82f6'
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

    actionBtn: {
        backgroundColor: '#3b82f6',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 10,
    },
    actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

    pendingLinkBox: {
        backgroundColor: '#334155',
        paddingVertical: 12, borderRadius: 10,
        alignItems: 'center', opacity: 0.5
    }
});
