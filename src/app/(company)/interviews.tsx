import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const INTERVIEW_STATUSES = ['Scheduled', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed', 'No-Show'];

export default function CompanyInterviewsScreen() {
    const { user, role } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [interviews, setInterviews] = useState<any[]>([]);
    const [shortlistedApps, setShortlistedApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Scheduling Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [intDate, setIntDate] = useState('');
    const [intTime, setIntTime] = useState('');
    const [intLink, setIntLink] = useState('');
    const [saving, setSaving] = useState(false);

    // Feedback State
    const [expandedIntId, setExpandedIntId] = useState<string | null>(null);
    const [feedbackVisible, setFeedbackVisible] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            const roleColumn = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

            const { data: activeInterviews } = await supabase
                .from('interviews')
                .select(`
                    *,
                    applications!inner ( id, candidate_id, jobs!inner (company_id, hiring_manager_id, title), profiles!applications_candidate_id_fkey (full_name) )
                `)
                .eq(`applications.jobs.${roleColumn}`, user.id)
                .order('interview_date', { ascending: false });

            if (activeInterviews) setInterviews(activeInterviews);

            const { data: shortlisted } = await supabase
                .from('applications')
                .select(`id, status, candidate_id, jobs!inner (company_id, hiring_manager_id, title), profiles!applications_candidate_id_fkey (full_name)`)
                .eq(`jobs.${roleColumn}`, user.id)
                .in('status', ['Shortlisted', 'Test Passed', 'Interview Scheduled']);

            if (shortlisted) {
                // Filter out apps that already have an active interview that isn't cancelled/no-show
                const activeAppIds = new Set(activeInterviews?.filter(i => i.status !== 'Cancelled' && i.status !== 'No-Show').map(i => i.application_id));
                setShortlistedApps(shortlisted.filter(app => !activeAppIds.has(app.id)));
            }

            setLoading(false);
        };
        fetchData();
    }, [user, saving]);

    const handleSchedule = async () => {
        if (!selectedApp || !intDate || !intTime) {
            if (Platform.OS === 'web') alert('Please provide a date and time.');
            else Alert.alert("Missing Fields", "Please provide a date and time.");
            return;
        }
        setSaving(true);
        const dateStr = `${intDate}T${intTime}:00`;

        const { error } = await supabase.from('interviews').insert({
            application_id: selectedApp.id,
            scheduled_by: user?.id,
            interview_date: new Date(dateStr).toISOString(),
            interview_type: 'Online',
            meeting_link: intLink,
            status: 'Scheduled',
            is_active: true
        });

        if (!error) {
            await supabase.from('applications').update({ status: 'Interview Scheduled' }).eq('id', selectedApp.id);
            await supabase.from('notifications').insert({
                user_id: selectedApp.candidate_id,
                title: 'Interview Scheduled',
                body: `You have been invited to an interview for ${selectedApp.jobs?.title} on ${intDate} at ${intTime}.`,
                type: 'interview_update'
            });
        }

        setSaving(false);
        if (error) {
            if (Platform.OS === 'web') alert('Error: ' + error.message);
            else Alert.alert('Scheduling Error', error.message);
        } else {
            setModalVisible(false); setIntDate(''); setIntTime(''); setIntLink('');
            if (Platform.OS === 'web') alert('Interview Scheduled!');
            else Alert.alert('Interview Scheduled', 'The candidate has been notified with the secure link.');
        }
    };

    const updateInterviewStatus = async (intId: string, newStatus: string, appId: string, candidateId: string) => {
        const { error } = await supabase.from('interviews').update({ status: newStatus }).eq('id', intId);
        if (!error) {
            setInterviews(interviews.map(i => i.id === intId ? { ...i, status: newStatus } : i));

            // Map interview status back to application if necessary
            if (newStatus === 'Completed') {
                await supabase.from('applications').update({ status: 'Interview Completed' }).eq('id', appId);
            } else if (newStatus === 'Cancelled' || newStatus === 'Rescheduled') {
                await supabase.from('notifications').insert({
                    user_id: candidateId,
                    title: `Interview ${newStatus}`,
                    body: `Your interview status has been updated to ${newStatus}.`,
                    type: 'interview_update'
                });
            }
        }
    };

    const submitFeedback = async (intId: string) => {
        if (!feedbackText.trim()) return;
        const { error } = await supabase.from('interviews').update({ feedback: feedbackText }).eq('id', intId);
        if (!error) {
            setInterviews(interviews.map(i => i.id === intId ? { ...i, feedback: feedbackText } : i));
            setFeedbackVisible(null);
            setFeedbackText('');
            if (Platform.OS === 'web') alert('Feedback saved successfully.');
            else Alert.alert('Success', 'Feedback saved successfully.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Scheduled': return { color: theme.warning, bg: 'rgba(251, 146, 60, 0.1)' };
            case 'Confirmed': return { color: theme.primary, bg: 'rgba(59, 130, 246, 0.1)' };
            case 'Completed': return { color: theme.success, bg: 'rgba(16, 185, 129, 0.1)' };
            case 'Cancelled': case 'No-Show': return { color: theme.danger, bg: 'rgba(244, 63, 94, 0.1)' };
            case 'Rescheduled': return { color: theme.warning, bg: 'rgba(168, 85, 247, 0.1)' };
            default: return { color: theme.textSecondary, bg: 'rgba(148, 163, 184, 0.1)' };
        }
    };

    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Interview Center</Text>
                <Text style={styles.subtitle}>Manage meetings and interview feedback.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {/* Active Interviews */}
                <Text style={styles.sectionTitle}>Upcoming & Past Interviews</Text>
                {interviews.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-clear-outline" size={32} color={theme.border} />
                        <Text style={styles.emptyText}>No interviews scheduled.</Text>
                    </View>
                ) : (
                    interviews.map(interview => {
                        const dateObj = new Date(interview.interview_date);
                        const ss = getStatusColor(interview.status);
                        const isExpanded = expandedIntId === interview.id;

                        return (
                            <TouchableOpacity key={interview.id} style={styles.interviewCard} onPress={() => setExpandedIntId(isExpanded ? null : interview.id)}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.calendarIconBg, { borderColor: ss.color }]}>
                                        <Text style={[styles.calMonth, { color: ss.color }]}>{dateObj.toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                                        <Text style={styles.calDay}>{dateObj.getDate()}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={styles.candidateName}>{interview.applications?.profiles?.full_name}</Text>
                                        <Text style={styles.jobTitle}>{interview.applications?.jobs?.title}</Text>
                                        <Text style={styles.timeStr}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                                        <Text style={[styles.statusText, { color: ss.color }]}>{interview.status}</Text>
                                    </View>
                                </View>

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        {/* Meeting Link */}
                                        {interview.meeting_link && (
                                            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(interview.meeting_link)}>
                                                <Ionicons name="videocam" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                                                <Text style={styles.linkBtnText}>Join Meeting</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Saved Feedback */}
                                        {interview.feedback && (
                                            <View style={styles.feedbackBox}>
                                                <Text style={styles.feedbackLabel}>Interview Feedback:</Text>
                                                <Text style={styles.feedbackText}>{interview.feedback}</Text>
                                            </View>
                                        )}

                                        {/* Status Update Actions */}
                                        <Text style={styles.actionPrompt}>Update Status:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                            {INTERVIEW_STATUSES.filter(s => s !== interview.status).map(status => {
                                                const btnColor = getStatusColor(status).color;
                                                return (
                                                    <TouchableOpacity key={status} style={[styles.statusActionBtn, { borderColor: btnColor }]} onPress={() => updateInterviewStatus(interview.id, status, interview.application_id, interview.applications?.candidate_id)}>
                                                        <Text style={[styles.statusActionBtnText, { color: btnColor }]}>{status}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>

                                        {/* Feedback Form Button */}
                                        {interview.status === 'Completed' && !interview.feedback && (
                                            <TouchableOpacity style={styles.addFeedbackBtn} onPress={() => setFeedbackVisible(interview.id)}>
                                                <Ionicons name="pencil" size={16} color={theme.text} style={{ marginRight: 6 }} />
                                                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 13 }}>Add Post-Interview Feedback</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Feedback Form */}
                                        {feedbackVisible === interview.id && (
                                            <View style={styles.feedbackFormBox}>
                                                <TextInput
                                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                                    placeholder="Evaluate candidate performance..."
                                                    placeholderTextColor={theme.textSecondary}
                                                    multiline
                                                    value={feedbackText}
                                                    onChangeText={setFeedbackText}
                                                />
                                                <TouchableOpacity style={styles.saveFeedbackBtn} onPress={() => submitFeedback(interview.id)}>
                                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Feedback</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Candidate Pipeline */}
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Candidates Awaiting Interview</Text>
                {shortlistedApps.length === 0 ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 13 }}>No candidates currently pending interview scheduling.</Text>
                ) : (
                    shortlistedApps.map(app => (
                        <View key={app.id} style={styles.shortlistCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.shortlistName}>{app.profiles?.full_name}</Text>
                                <Text style={styles.shortlistJob}>{app.jobs?.title} • <Text style={{ color: theme.success }}>{app.status}</Text></Text>
                            </View>
                            <TouchableOpacity style={styles.scheduleBtn} onPress={() => { setSelectedApp(app); setModalVisible(true); }}>
                                <Text style={styles.scheduleBtnText}>Schedule</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Scheduling Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Schedule Meeting</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.textSecondary, marginBottom: 20 }}>
                            Candidate: <Text style={{ color: theme.text, fontWeight: 'bold' }}>{selectedApp?.profiles?.full_name}</Text>
                        </Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput style={styles.input} value={intDate} onChangeText={setIntDate} placeholder="2026-11-20" placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Time (HH:MM) - 24hr format</Text>
                            <TextInput style={styles.input} value={intTime} onChangeText={setIntTime} placeholder="14:30" placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Meeting Link (Google Meet / Zoom)</Text>
                            <TextInput style={styles.input} value={intLink} onChangeText={setIntLink} placeholder="https://meet.google.com/..." placeholderTextColor={theme.textSecondary} />
                        </View>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleSchedule} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Dispatch Schedule</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20 },
    emptyText: { color: theme.text, fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    interviewCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    calendarIconBg: { backgroundColor: theme.background, borderRadius: 12, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    calMonth: { fontSize: 11, fontWeight: '900' },
    calDay: { color: theme.text, fontSize: 18, fontWeight: '900' },
    candidateName: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    jobTitle: { color: theme.textSecondary, fontSize: 13, marginBottom: 2 },
    timeStr: { color: theme.primary, fontSize: 12, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: 'bold' },

    expandedSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border },
    linkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 8, marginBottom: 16 },
    linkBtnText: { color: theme.primary, fontSize: 13, fontWeight: 'bold' },

    feedbackBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.success },
    feedbackLabel: { color: theme.success, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    feedbackText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },

    actionPrompt: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    statusActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
    statusActionBtnText: { fontSize: 11, fontWeight: 'bold' },

    addFeedbackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border, padding: 10, borderRadius: 8, marginTop: 12 },
    feedbackFormBox: { marginTop: 12 },
    saveFeedbackBtn: { backgroundColor: theme.success, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },

    shortlistCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    shortlistName: { color: theme.text, fontSize: 15, fontWeight: 'bold' },
    shortlistJob: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
    scheduleBtn: { backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    scheduleBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: theme.text, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: theme.background, color: theme.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border },
    submitBtn: { backgroundColor: theme.success, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
