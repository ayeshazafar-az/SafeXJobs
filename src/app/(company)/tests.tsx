import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CompanyTestsScreen() {
    const { user, role } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [testTitle, setTestTitle] = useState('');
    const [testDesc, setTestDesc] = useState('');
    const [maxMarks, setMaxMarks] = useState('100');
    const [passingMarks, setPassingMarks] = useState('50');
    const [testDeadline, setTestDeadline] = useState('');
    const [saving, setSaving] = useState(false);

    // Evaluation state
    const [evalTestId, setEvalTestId] = useState<string | null>(null);
    const [evalMarks, setEvalMarks] = useState('');
    const [evalComments, setEvalComments] = useState('');

    const fetchData = async () => {
        if (!user) return;
        const roleColumn = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

        const { data: activeTests } = await supabase
            .from('tests')
            .select(`*, applications!inner ( id, candidate_id, jobs!inner (company_id, hiring_manager_id, title), profiles!applications_candidate_id_fkey (full_name) )`)
            .eq(`applications.jobs.${roleColumn}`, user.id)
            .order('created_at', { ascending: false });

        if (activeTests) setTests(activeTests);

        const { data: apps } = await supabase
            .from('applications')
            .select(`id, status, candidate_id, jobs!inner (company_id, hiring_manager_id, title), profiles!applications_candidate_id_fkey (full_name)`)
            .eq(`jobs.${roleColumn}`, user.id)
            .neq('status', 'Rejected').neq('status', 'Hired');

        if (apps) setApplications(apps);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [user, saving]);

    const handleAssign = async () => {
        if (!selectedApp || !testTitle) {
            if (Platform.OS === 'web') alert('Please select a candidate and provide a test title.');
            else Alert.alert("Missing Fields", "Please provide a test title and select a candidate.");
            return;
        }
        setSaving(true);

        const { error } = await supabase.from('tests').insert({
            application_id: selectedApp.id,
            assigned_by: user?.id,
            title: testTitle,
            description: testDesc,
            max_marks: parseInt(maxMarks) || 100,
            passing_marks: parseInt(passingMarks) || 50,
            deadline: testDeadline || null,
            status: 'Pending',
        });

        // Update application status to Test Assigned
        if (!error) {
            await supabase.from('applications').update({ status: 'Test Assigned' }).eq('id', selectedApp.id);
            // Notify candidate
            await supabase.from('notifications').insert({
                user_id: selectedApp.candidate_id,
                title: 'New Test Assigned',
                body: `You have received a new assessment: "${testTitle}". Please check your Tests section.`,
                type: 'test_assigned',
            });
        }

        setSaving(false);
        if (error) {
            if (Platform.OS === 'web') alert('Error: ' + error.message);
            else Alert.alert('Dispatch Error', error.message);
        } else {
            setModalVisible(false);
            setTestTitle(''); setTestDesc(''); setMaxMarks('100'); setPassingMarks('50'); setTestDeadline('');
            if (Platform.OS === 'web') alert('Assessment dispatched!');
            else Alert.alert('Assessment Assigned', 'The candidate has been notified.');
        }
    };

    const handleEval = async (testId: string, appId: string, candidateId: string, passed: boolean) => {
        const newStatus = passed ? 'Passed' : 'Failed';
        const updates: any = {
            status: newStatus,
            obtained_marks: parseInt(evalMarks) || null,
            evaluator_comments: evalComments || null,
        };

        const { error } = await supabase.from('tests').update(updates).eq('id', testId);
        if (!error) {
            setTests(tests.map(t => t.id === testId ? { ...t, ...updates } : t));
            setEvalTestId(null); setEvalMarks(''); setEvalComments('');

            // Auto-cascade: update application status
            const appStatus = passed ? 'Test Passed' : 'Rejected';
            await supabase.from('applications').update({ status: appStatus }).eq('id', appId);

            // Notify candidate
            await supabase.from('notifications').insert({
                user_id: candidateId,
                title: passed ? 'Test Passed!' : 'Test Result',
                body: passed
                    ? 'Congratulations! You passed the assessment. The hiring team will proceed with the next steps.'
                    : 'Thank you for completing the assessment. Unfortunately, you did not meet the passing criteria.',
                type: 'test_result',
            });
        } else {
            if (Platform.OS === 'web') alert('Update failed: ' + error.message);
            else Alert.alert('Update Failed', error.message);
        }
    };

    const openUrl = (url: string) => {
        if (url) Linking.openURL(url).catch(() => {
            if (Platform.OS === 'web') alert('Invalid URL');
            else Alert.alert('Invalid URL', 'Could not open the submission link.');
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return { bg: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' };
            case 'Submitted': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
            case 'Passed': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'Failed': return { bg: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' };
            default: return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' };
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Skill Assessments</Text>
                <Text style={styles.subtitle}>Assign, review, and evaluate candidate tests.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={styles.sectionTitle}>Active Assessments</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {tests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color="#334155" />
                        <Text style={styles.emptyText}>No tests assigned yet.</Text>
                    </View>
                ) : (
                    tests.map(test => {
                        const ss = getStatusStyle(test.status);
                        const isSubmitted = test.status === 'Submitted';
                        const isEvaluating = evalTestId === test.id;

                        return (
                            <View key={test.id} style={styles.testCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.testTitle}>{test.title}</Text>
                                        <Text style={styles.candidateName}>Candidate: {test.applications?.profiles?.full_name}</Text>
                                        {test.max_marks && (
                                            <Text style={styles.marksInfo}>
                                                Max: {test.max_marks} | Pass: {test.passing_marks}
                                                {test.obtained_marks != null ? ` | Scored: ${test.obtained_marks}` : ''}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                                        <Text style={[styles.statusText, { color: ss.color }]}>{test.status}</Text>
                                    </View>
                                </View>

                                {test.deadline && (
                                    <View style={styles.deadlineBanner}>
                                        <Ionicons name="time-outline" size={14} color="#f59e0b" />
                                        <Text style={styles.deadlineText}>Deadline: {new Date(test.deadline).toLocaleDateString()}</Text>
                                    </View>
                                )}

                                {test.evaluator_comments && (
                                    <View style={styles.commentBox}>
                                        <Text style={styles.commentLabel}>Your Feedback:</Text>
                                        <Text style={styles.commentText}>{test.evaluator_comments}</Text>
                                    </View>
                                )}

                                {isSubmitted && (
                                    <View>
                                        {/* Submission link */}
                                        {test.submission_url && (
                                            <TouchableOpacity style={styles.reviewBtn} onPress={() => openUrl(test.submission_url)}>
                                                <Ionicons name="link" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
                                                <Text style={styles.reviewBtnText}>Review Submission Link</Text>
                                            </TouchableOpacity>
                                        )}
                                        {test.submission_text && (
                                            <View style={styles.submissionTextBox}>
                                                <Text style={styles.submissionTextLabel}>Written Answer:</Text>
                                                <Text style={styles.submissionText}>{test.submission_text}</Text>
                                            </View>
                                        )}

                                        {/* Evaluation Controls */}
                                        {isEvaluating ? (
                                            <View style={styles.evalForm}>
                                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={`Marks (out of ${test.max_marks || 100})`} placeholderTextColor="#64748b" keyboardType="numeric" value={evalMarks} onChangeText={setEvalMarks} />
                                                </View>
                                                <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top', marginBottom: 10 }]} placeholder="Comments / Feedback for candidate..." placeholderTextColor="#64748b" multiline value={evalComments} onChangeText={setEvalComments} />
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <TouchableOpacity style={[styles.evalBtn, { backgroundColor: '#10b981' }]} onPress={() => handleEval(test.id, test.application_id, test.applications?.candidate_id, true)}>
                                                        <Text style={styles.evalText}>Pass</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.evalBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleEval(test.id, test.application_id, test.applications?.candidate_id, false)}>
                                                        <Text style={styles.evalText}>Fail</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.evalBtn, { backgroundColor: '#334155' }]} onPress={() => setEvalTestId(null)}>
                                                        <Text style={styles.evalText}>Cancel</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={styles.evalTrigger} onPress={() => setEvalTestId(test.id)}>
                                                <Ionicons name="clipboard-outline" size={18} color="#f8fafc" style={{ marginRight: 8 }} />
                                                <Text style={styles.evalTriggerText}>Evaluate Submission</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Create Test Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={styles.modalTitle}>Dispatch New Test</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Select Candidate</Text>
                                <ScrollView style={{ maxHeight: 120, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' }}>
                                    {applications.map(app => (
                                        <TouchableOpacity key={app.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: selectedApp?.id === app.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }} onPress={() => setSelectedApp(app)}>
                                            <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>{app.profiles?.full_name}</Text>
                                            <Text style={{ color: '#64748b', fontSize: 11 }}>{app.jobs?.title} • {app.status}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Test Title *</Text>
                                <TextInput style={styles.input} value={testTitle} onChangeText={setTestTitle} placeholder="e.g. React Native Challenge" placeholderTextColor="#64748b" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Instructions</Text>
                                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={testDesc} onChangeText={setTestDesc} placeholder="Write detailed requirements..." placeholderTextColor="#64748b" multiline />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Max Marks</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={maxMarks} onChangeText={setMaxMarks} placeholder="100" placeholderTextColor="#64748b" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Passing Marks</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={passingMarks} onChangeText={setPassingMarks} placeholder="50" placeholderTextColor="#64748b" />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
                                <TextInput style={styles.input} value={testDeadline} onChangeText={setTestDeadline} placeholder="2026-09-30" placeholderTextColor="#64748b" />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAssign} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Dispatch Assessment</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },
    listContent: { padding: 20, paddingBottom: 100 },
    sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#3b82f6', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20, marginTop: 40 },
    emptyText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    testCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    testTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    candidateName: { color: '#94a3b8', fontSize: 13, marginBottom: 2 },
    marksInfo: { color: '#60a5fa', fontSize: 11, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    deadlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, marginBottom: 12 },
    deadlineText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },

    commentBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#60a5fa' },
    commentLabel: { color: '#60a5fa', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    commentText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },

    reviewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginTop: 12 },
    reviewBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: 'bold' },

    submissionTextBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#334155' },
    submissionTextLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 4 },
    submissionText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },

    evalForm: { marginTop: 16, padding: 16, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
    evalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    evalText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    evalTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', paddingVertical: 12, borderRadius: 10, marginTop: 12 },
    evalTriggerText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
    submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
