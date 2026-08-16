import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CompanyInterviewsScreen() {
    const { user, role } = useAuth();
    const [interviews, setInterviews] = useState<any[]>([]);
    const [shortlistedApps, setShortlistedApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [intDate, setIntDate] = useState('');
    const [intTime, setIntTime] = useState('');
    const [intLink, setIntLink] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            const roleColumn = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

            // 1. Fetch previously scheduled interviews
            const { data: activeInterviews } = await supabase
                .from('interviews')
                .select(`
                    *,
                    applications!inner (
                        jobs!inner (company_id, hiring_manager_id, title),
                        profiles!applications_candidate_id_fkey (full_name)
                    )
                `)
                .eq(`applications.jobs.${roleColumn}`, user.id)
                .order('interview_date', { ascending: true });

            if (activeInterviews) setInterviews(activeInterviews);

            // 2. Fetch shortlisted applications that don't have interviews yet
            const { data: shortlisted } = await supabase
                .from('applications')
                .select(`
                    id, 
                    status,
                    jobs!inner (company_id, hiring_manager_id, title),
                    profiles!applications_candidate_id_fkey (full_name)
                `)
                .eq(`jobs.${roleColumn}`, user.id)
                .in('status', ['Shortlisted', 'Interview']); // Candidates in interviewing pipeline

            if (shortlisted) setShortlistedApps(shortlisted);

            setLoading(false);
        };
        fetchData();
    }, [user, saving]); // refresh on save

    const handleSchedule = async () => {
        if (!selectedApp || !intDate || !intTime) {
            Alert.alert("Missing Fields", "Please provide a date and time.");
            return;
        }
        setSaving(true);

        const dateStr = `${intDate}T${intTime}:00`; // simple combined iso map

        const { error } = await supabase.from('interviews').insert({
            application_id: selectedApp.id,
            interview_date: new Date(dateStr).toISOString(),
            interview_type: 'Online',
            meeting_link: intLink
        });

        // Officially update App status to "Interview"
        await supabase.from('applications').update({ status: 'Interview' }).eq('id', selectedApp.id);

        setSaving(false);
        if (error) {
            Alert.alert('Scheduling Error', error.message);
        } else {
            setModalVisible(false);
            Alert.alert('Interview Scheduled', 'The candidate has been notified with the secure link.');
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Interview Scheduling</Text>
                <Text style={styles.subtitle}>Manage meetings with shortlisted candidates.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>

                {/* Active Scheduled Interviews */}
                <Text style={styles.sectionTitle}>Upcoming Scheduled Interviews</Text>
                {interviews.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-clear-outline" size={32} color="#334155" />
                        <Text style={styles.emptyText}>No interviews scheduled.</Text>
                    </View>
                ) : (
                    interviews.map(interview => {
                        const dateObj = new Date(interview.interview_date);
                        return (
                            <View key={interview.id} style={styles.interviewCard}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.calendarIconBg, { borderColor: '#10b981' }]}>
                                        <Text style={[styles.calMonth, { color: '#10b981' }]}>{dateObj.toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                                        <Text style={styles.calDay}>{dateObj.getDate()}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={styles.candidateName}>{interview.applications?.profiles?.full_name}</Text>
                                        <Text style={styles.jobTitle}>{interview.applications?.jobs?.title}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Candidate Pipeline to Schedule */}
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Schedule New Interview</Text>
                {shortlistedApps.length === 0 ? (
                    <Text style={{ color: '#64748b', fontSize: 13 }}>No candidates are currency shortlisted or awaiting interviews.</Text>
                ) : (
                    shortlistedApps.map(app => (
                        <View key={app.id} style={styles.shortlistCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.shortlistName}>{app.profiles?.full_name}</Text>
                                <Text style={styles.shortlistJob}>{app.jobs?.title}</Text>
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
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: '#94a3b8', marginBottom: 20 }}>
                            Candidate: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedApp?.profiles?.full_name}</Text>
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput style={styles.input} value={intDate} onChangeText={setIntDate} placeholder="2024-11-20" placeholderTextColor="#64748b" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Time (HH:MM)</Text>
                            <TextInput style={styles.input} value={intTime} onChangeText={setIntTime} placeholder="14:30" placeholderTextColor="#64748b" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Meeting Link (Google Meet / Zoom)</Text>
                            <TextInput style={styles.input} value={intLink} onChangeText={setIntLink} placeholder="https://meet.google.com/..." placeholderTextColor="#64748b" />
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
    sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },

    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20 },
    emptyText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    interviewCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16, padding: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: '#334155'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    calendarIconBg: {
        backgroundColor: '#0f172a', borderRadius: 12,
        width: 54, height: 54,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    calMonth: { fontSize: 11, fontWeight: '900' },
    calDay: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
    candidateName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    jobTitle: { color: '#94a3b8', fontSize: 13 },

    shortlistCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#1e293b', padding: 16, borderRadius: 12,
        marginBottom: 10, borderWidth: 1, borderColor: '#334155'
    },
    shortlistName: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
    shortlistJob: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    scheduleBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    scheduleBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },

    inputGroup: { marginBottom: 16 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },

    submitBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
