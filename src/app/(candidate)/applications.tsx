import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PIPELINE_STEPS = [
    'Applied', 'Under Review', 'Shortlisted', 'Test Assigned', 'Test Submitted',
    'Test Passed', 'Interview Scheduled', 'Interview Completed', 'Selected', 'Offer Sent', 'Hired'
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Applied': return '#94a3b8';
        case 'Under Review': return '#60a5fa';
        case 'Shortlisted': return '#a78bfa';
        case 'Test Assigned': return '#f59e0b';
        case 'Test Submitted': return '#fbbf24';
        case 'Test Passed': return '#34d399';
        case 'Interview Scheduled': return '#fb923c';
        case 'Interview Completed': return '#38bdf8';
        case 'Selected': return '#10b981';
        case 'Offer Sent': return '#06b6d4';
        case 'Hired': return '#22c55e';
        case 'Offer Declined': return '#f97316';
        case 'Rejected': return '#f43f5e';
        case 'Withdrawn': return '#64748b';
        default: return '#94a3b8';
    }
};

const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
        case 'Applied': return 'paper-plane';
        case 'Under Review': return 'eye';
        case 'Shortlisted': return 'star';
        case 'Test Assigned': return 'document-text';
        case 'Test Submitted': return 'checkmark-circle';
        case 'Test Passed': return 'trophy';
        case 'Interview Scheduled': return 'calendar';
        case 'Interview Completed': return 'videocam';
        case 'Selected': return 'ribbon';
        case 'Offer Sent': return 'gift';
        case 'Hired': return 'briefcase';
        case 'Offer Declined': return 'close';
        case 'Rejected': return 'close-circle';
        case 'Withdrawn': return 'exit';
        default: return 'ellipse';
    }
};

export default function CandidateApplicationsScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

    const handleWithdraw = async (appId: string) => {
        Alert.alert('Withdraw Application', 'Are you sure you want to withdraw from this position? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Withdraw', style: 'destructive', onPress: async () => {
                    setWithdrawingId(appId);
                    const { error } = await supabase.from('applications').update({ status: 'Withdrawn' }).eq('id', appId);
                    if (error) {
                        if (Platform.OS === 'web') alert('Withdraw failed: ' + error.message);
                        else Alert.alert('Error', 'Failed to withdraw application.');
                    }
                    setWithdrawingId(null);
                }
            }
        ]);
    };

    const fetchApplications = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                jobs (
                    title, company_id, job_type, location,
                    profiles!jobs_company_id_fkey ( company_name )
                ),
                profiles!applications_candidate_id_fkey (
                    company_name
                )
            `)
            .eq('candidate_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch error:", error);
        } else if (data) {
            setApplications(data);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchApplications();

        if (!user) return;
        const channel = supabase.channel(`candidate_apps_${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' },
                () => {
                    fetchApplications(); // Re-fetch on any DB changes to Applications
                }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const onRefresh = () => { setRefreshing(true); fetchApplications(); };

    const getPipelineIndex = (status: string) => {
        const idx = PIPELINE_STEPS.indexOf(status);
        return idx === -1 ? -1 : idx;
    };

    const handleOfferResponse = async (app: any, accepted: boolean) => {
        setRespondingId(app.id);
        const newStatus = accepted ? 'Hired' : 'Offer Declined';
        const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', app.id);
        setRespondingId(null);

        if (error) {
            if (Platform.OS === 'web') alert('Failed to respond: ' + error.message);
            else Alert.alert('Error', error.message);
            return;
        }

        setApplications(apps => apps.map(a => a.id === app.id ? { ...a, status: newStatus } : a));

        // Notify the company
        const companyId = app.jobs?.company_id;
        if (companyId) {
            const notifTitle = accepted ? '✅ Offer Accepted!' : '❌ Offer Declined';
            const notifBody = accepted
                ? `The candidate has accepted the offer for the ${app.jobs?.title || 'job'} position.`
                : `The candidate has declined the offer for the ${app.jobs?.title || 'job'} position.`;
            await supabase.from('notifications').insert({
                user_id: companyId,
                title: notifTitle,
                body: notifBody,
                type: 'offer_response',
            });
        }

        if (Platform.OS === 'web') alert(accepted ? 'Offer accepted! Congratulations!' : 'Offer declined.');
        else Alert.alert(accepted ? '🎉 Congratulations!' : 'Offer Declined', accepted ? 'You have accepted the job offer!' : 'You have declined the offer. The company has been notified.');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Applications</Text>
                <Text style={styles.subtitle}>Track your job application progress</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : applications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-outline" size={64} color={theme.border} />
                        <Text style={styles.emptyText}>No applications yet</Text>
                        <Text style={styles.emptySubText}>Start browsing jobs and submit your first application!</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const job = app.jobs;
                        const statusColor = getStatusColor(app.status);
                        const statusIcon = getStatusIcon(app.status);
                        const pipelineIdx = getPipelineIndex(app.status);
                        const isTerminal = app.status === 'Rejected' || app.status === 'Withdrawn' || app.status === 'Offer Declined';
                        const companyName = app.profiles?.company_name;

                        return (
                            <View key={app.id} style={styles.appCard}>
                                {/* Header with status */}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.statusIconBox, { backgroundColor: `${statusColor}20` }]}>
                                        <Ionicons name={statusIcon} size={22} color={statusColor} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.jobTitle}>{job?.title || 'Untitled Job'}</Text>
                                        {companyName && <Text style={styles.companyText}>{companyName}</Text>}
                                        <Text style={styles.metaText}>
                                            {job?.location || ''}{job?.job_type ? ` • ${job.job_type}` : ''}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{app.status}</Text>
                                    </View>
                                </View>

                                {/* Visual Pipeline Tracker */}
                                {!isTerminal && (
                                    <View style={styles.pipelineContainer}>
                                        <View style={styles.pipelineTrack}>
                                            {PIPELINE_STEPS.map((step, i) => {
                                                const isCompleted = i <= pipelineIdx;
                                                const isCurrent = i === pipelineIdx;
                                                return (
                                                    <View key={step} style={styles.pipelineStep}>
                                                        <View style={[
                                                            styles.pipelineDot,
                                                            isCompleted && { backgroundColor: statusColor, borderColor: statusColor },
                                                            isCurrent && { width: 14, height: 14, borderRadius: 7 }
                                                        ]} />
                                                        {i < PIPELINE_STEPS.length - 1 && (
                                                            <View style={[
                                                                styles.pipelineLine,
                                                                isCompleted && i < pipelineIdx && { backgroundColor: statusColor }
                                                            ]} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        <View style={styles.pipelineLabels}>
                                            <Text style={[styles.pipelineLabel, { color: getStatusColor(PIPELINE_STEPS[0]) }]}>Applied</Text>
                                            <Text style={[styles.pipelineLabel, { color: statusColor, fontWeight: 'bold' }]}>{app.status}</Text>
                                            <Text style={[styles.pipelineLabel, { color: theme.border }]}>Hired</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Rejected/Withdrawn Banner */}
                                {isTerminal && (
                                    <View style={[styles.terminalBanner, { borderColor: `${statusColor}40` }]}>
                                        <Ionicons name={app.status === 'Rejected' ? 'close-circle' : app.status === 'Offer Declined' ? 'close' : 'exit-outline'} size={18} color={statusColor} />
                                        <Text style={[styles.terminalText, { color: statusColor }]}>
                                            {app.status === 'Rejected'
                                                ? 'This application was not selected to proceed further.'
                                                : app.status === 'Offer Declined'
                                                    ? 'You declined the job offer for this position.'
                                                    : 'You withdrew this application.'}
                                        </Text>
                                    </View>
                                )}

                                {/* Offer Details Banner */}
                                {app.status === 'Offer Sent' && (
                                    <View style={styles.offerBanner}>
                                        <View style={styles.offerHeader}>
                                            <Ionicons name="gift" size={22} color="#06b6d4" />
                                            <Text style={styles.offerTitle}>Job Offer</Text>
                                        </View>

                                        {app.offer_salary && (
                                            <View style={styles.offerRow}>
                                                <Text style={styles.offerLabel}>Salary</Text>
                                                <Text style={styles.offerValue}>{app.offer_salary} PKR</Text>
                                            </View>
                                        )}
                                        {app.offer_start_date && (
                                            <View style={styles.offerRow}>
                                                <Text style={styles.offerLabel}>Start Date</Text>
                                                <Text style={styles.offerValue}>{app.offer_start_date}</Text>
                                            </View>
                                        )}
                                        {app.offer_terms && (
                                            <View style={styles.offerRow}>
                                                <Text style={styles.offerLabel}>Terms</Text>
                                                <Text style={styles.offerValue}>{app.offer_terms}</Text>
                                            </View>
                                        )}

                                        <View style={styles.offerActions}>
                                            <TouchableOpacity
                                                style={[styles.offerBtn, styles.offerAcceptBtn]}
                                                onPress={() => handleOfferResponse(app, true)}
                                                disabled={respondingId === app.id}
                                            >
                                                {respondingId === app.id ? <ActivityIndicator color="#fff" size="small" /> : (
                                                    <>
                                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                                        <Text style={styles.offerBtnText}>Accept Offer</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.offerBtn, styles.offerDeclineBtn]}
                                                onPress={() => handleOfferResponse(app, false)}
                                                disabled={respondingId === app.id}
                                            >
                                                <Ionicons name="close-circle" size={18} color="#f97316" />
                                                <Text style={[styles.offerBtnText, { color: '#f97316' }]}>Decline</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                    <Text style={styles.dateText}>Applied on {new Date(app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                                    {!isTerminal && app.status !== 'Hired' && (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center' }}
                                            onPress={() => handleWithdraw(app.id)}
                                            disabled={withdrawingId === app.id}
                                        >
                                            {withdrawingId === app.id ? <ActivityIndicator size="small" color={theme.danger} /> : (
                                                <>
                                                    <Ionicons name="trash-outline" size={14} color={theme.danger} />
                                                    <Text style={{ color: theme.danger, fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}>Withdraw</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
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

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },

    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: theme.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

    appCard: {
        backgroundColor: theme.card, borderRadius: 16,
        padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: theme.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    statusIconBox: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    jobTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    companyText: { color: theme.textSecondary, fontSize: 13, marginBottom: 2 },
    metaText: { color: theme.textSecondary, fontSize: 11 },
    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1,
    },
    statusBadgeText: { fontSize: 11, fontWeight: 'bold' },

    // Visual Pipeline Tracker
    pipelineContainer: { marginBottom: 16 },
    pipelineTrack: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
    pipelineStep: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    pipelineDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: theme.border, borderWidth: 2, borderColor: theme.border,
    },
    pipelineLine: { flex: 1, height: 2, backgroundColor: theme.border },
    pipelineLabels: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 0, marginTop: 6,
    },
    pipelineLabel: { fontSize: 10, fontWeight: '500' },

    // Terminal state
    terminalBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(244, 63, 94, 0.06)', padding: 12, borderRadius: 10,
        borderWidth: 1, marginBottom: 12,
    },
    terminalText: { fontSize: 12, lineHeight: 18, flex: 1 },

    dateText: { color: theme.textSecondary, fontSize: 11, textAlign: 'right' },

    // Offer Banner
    offerBanner: {
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.25)',
        borderRadius: 12, padding: 16, marginBottom: 12,
    },
    offerHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    offerTitle: { color: '#06b6d4', fontSize: 16, fontWeight: 'bold' },
    offerRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: 'rgba(6, 182, 212, 0.1)',
    },
    offerLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    offerValue: { color: theme.text, fontSize: 14, fontWeight: 'bold' },
    offerActions: {
        flexDirection: 'row', gap: 10, marginTop: 14,
    },
    offerBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    offerAcceptBtn: { backgroundColor: '#10b981' },
    offerDeclineBtn: {
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 1, borderColor: 'rgba(249, 115, 22, 0.3)',
    },
    offerBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
