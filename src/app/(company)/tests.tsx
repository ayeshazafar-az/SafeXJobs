import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function VideoModal({ url, visible, onClose }: { url: string, visible: boolean, onClose: () => void }) {
    const player = useVideoPlayer(url, player => {
        player.loop = false;
        if (visible) player.play();
    });

    useEffect(() => {
        if (!visible) player.pause();
    }, [visible]);

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.videoOverlay}>
                <View style={styles.videoContent}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <VideoView player={player} style={styles.videoPlayer} />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    videoContent: { width: '100%', height: 350, position: 'relative' },
    videoPlayer: { width: '100%', height: '100%' },
    closeVideoBtn: { position: 'absolute', top: -40, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }
});

export default function CompanyTestsScreen() {
    const { user, role } = useAuth();
    const { theme } = useTheme();
    const screenStyles = getStyles(theme);
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

    const [evalTestId, setEvalTestId] = useState<string | null>(null);
    const [evalMarks, setEvalMarks] = useState('');
    const [evalComments, setEvalComments] = useState('');

    const [videoUrl, setVideoUrl] = useState('');
    const [videoVisible, setVideoVisible] = useState(false);

    // MCQ State
    const [isMCQ, setIsMCQ] = useState(false);
    const [mcqQuestions, setMcqQuestions] = useState([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);

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

        let finalDesc = testDesc;
        if (isMCQ) {
            const mcqPayload = { isMCQ: true, questions: mcqQuestions };
            finalDesc = `[MCQ_JSON]${JSON.stringify(mcqPayload)}`;
        }

        const { error } = await supabase.from('tests').insert({
            application_id: selectedApp.id,
            assigned_by: user?.id,
            title: testTitle,
            description: finalDesc,
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
            setIsMCQ(false); setMcqQuestions([{ question: '', options: ['', '', '', ''], correctIndex: 0 }]);
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return { bg: 'rgba(251, 146, 60, 0.1)', color: theme.warning };
            case 'Submitted': return { bg: 'rgba(59, 130, 246, 0.1)', color: theme.primary };
            case 'Passed': return { bg: 'rgba(16, 185, 129, 0.1)', color: theme.success };
            case 'Failed': return { bg: 'rgba(244, 63, 94, 0.1)', color: theme.danger };
            default: return { bg: 'rgba(148, 163, 184, 0.1)', color: theme.textSecondary };
        }
    };

    const isVideoUrl = (url: string) => {
        const lower = url.toLowerCase();
        return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.webm');
    };

    const handleSubmissionClick = (url: string) => {
        if (isVideoUrl(url)) {
            setVideoUrl(url);
            setVideoVisible(true);
        } else {
            Linking.openURL(url);
        }
    };

    const addMcqQuestion = () => setMcqQuestions([...mcqQuestions, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);

    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <View style={screenStyles.container}>
            <View style={screenStyles.header}>
                <Text style={screenStyles.title}>Skill Assessments</Text>
                <Text style={screenStyles.subtitle}>Assign, review, and evaluate candidate tests.</Text>
            </View>

            <ScrollView contentContainerStyle={screenStyles.listContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={screenStyles.sectionTitle}>Active Assessments</Text>
                    <TouchableOpacity style={screenStyles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {tests.length === 0 ? (
                    <View style={screenStyles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={48} color={theme.border} />
                        <Text style={screenStyles.emptyText}>No tests assigned yet.</Text>
                    </View>
                ) : (
                    tests.map(test => {
                        const ss = getStatusStyle(test.status);
                        const isSubmitted = test.status === 'Submitted';
                        const isEvaluating = evalTestId === test.id;

                        return (
                            <View key={test.id} style={screenStyles.testCard}>
                                <View style={screenStyles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={screenStyles.testTitle}>{test.title}</Text>
                                        <Text style={screenStyles.candidateName}>Candidate: {test.applications?.profiles?.full_name}</Text>
                                        {test.max_marks && (
                                            <Text style={screenStyles.marksInfo}>
                                                Max: {test.max_marks} | Pass: {test.passing_marks}
                                                {test.obtained_marks != null ? ` | Scored: ${test.obtained_marks}` : ''}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[screenStyles.statusBadge, { backgroundColor: ss.bg }]}>
                                        <Text style={[screenStyles.statusText, { color: ss.color }]}>{test.status}</Text>
                                    </View>
                                </View>

                                {test.deadline && (
                                    <View style={screenStyles.deadlineBanner}>
                                        <Ionicons name="time-outline" size={14} color={theme.warning} />
                                        <Text style={screenStyles.deadlineText}>Deadline: {new Date(test.deadline).toLocaleDateString()}</Text>
                                    </View>
                                )}

                                {test.evaluator_comments && (
                                    <View style={screenStyles.commentBox}>
                                        <Text style={screenStyles.commentLabel}>Your Feedback:</Text>
                                        <Text style={screenStyles.commentText}>{test.evaluator_comments}</Text>
                                    </View>
                                )}

                                {isSubmitted && (
                                    <View>
                                        {/* Submission link */}
                                        {test.submission_url && (
                                            <TouchableOpacity style={screenStyles.reviewBtn} onPress={() => handleSubmissionClick(test.submission_url)}>
                                                <Ionicons name={isVideoUrl(test.submission_url) ? "videocam" : "link"} size={18} color={theme.primary} style={{ marginRight: 6 }} />
                                                <Text style={screenStyles.reviewBtnText}>{isVideoUrl(test.submission_url) ? "Watch Submission Video" : "Review Submission Link"}</Text>
                                            </TouchableOpacity>
                                        )}
                                        {test.submission_text && (
                                            <View style={screenStyles.submissionTextBox}>
                                                <Text style={screenStyles.submissionTextLabel}>Written Answer:</Text>
                                                <Text style={screenStyles.submissionText}>{test.submission_text}</Text>
                                            </View>
                                        )}

                                        {/* Evaluation Controls */}
                                        {isEvaluating ? (
                                            <View style={screenStyles.evalForm}>
                                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                                    <TextInput style={[screenStyles.input, { flex: 1 }]} placeholder={`Marks (out of ${test.max_marks || 100})`} placeholderTextColor={theme.textSecondary} keyboardType="numeric" value={evalMarks} onChangeText={setEvalMarks} />
                                                </View>
                                                <TextInput style={[screenStyles.input, { height: 70, textAlignVertical: 'top', marginBottom: 10 }]} placeholder="Comments / Feedback for candidate..." placeholderTextColor={theme.textSecondary} multiline value={evalComments} onChangeText={setEvalComments} />
                                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                                    <TouchableOpacity style={[screenStyles.evalBtn, { backgroundColor: theme.success }]} onPress={() => handleEval(test.id, test.application_id, test.applications?.candidate_id, true)}>
                                                        <Text style={screenStyles.evalText}>Pass</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[screenStyles.evalBtn, { backgroundColor: theme.danger }]} onPress={() => handleEval(test.id, test.application_id, test.applications?.candidate_id, false)}>
                                                        <Text style={screenStyles.evalText}>Fail</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[screenStyles.evalBtn, { backgroundColor: theme.border }]} onPress={() => setEvalTestId(null)}>
                                                        <Text style={screenStyles.evalText}>Cancel</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={screenStyles.evalTrigger} onPress={() => setEvalTestId(test.id)}>
                                                <Ionicons name="clipboard-outline" size={18} color={theme.text} style={{ marginRight: 8 }} />
                                                <Text style={screenStyles.evalTriggerText}>Evaluate Submission</Text>
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={screenStyles.modalOverlay}>
                    <View style={screenStyles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={screenStyles.modalTitle}>Dispatch New Test</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                            <View style={screenStyles.inputGroup}>
                                <Text style={screenStyles.label}>Select Candidate</Text>
                                <ScrollView style={{ maxHeight: 120, backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                                    {applications.map(app => (
                                        <TouchableOpacity key={app.id} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.card, backgroundColor: selectedApp?.id === app.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }} onPress={() => setSelectedApp(app)}>
                                            <Text style={{ color: theme.text, fontWeight: 'bold' }}>{app.profiles?.full_name}</Text>
                                            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>{app.jobs?.title} • {app.status}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={screenStyles.inputGroup}>
                                <Text style={screenStyles.label}>Test Title *</Text>
                                <TextInput style={screenStyles.input} value={testTitle} onChangeText={setTestTitle} placeholder="e.g. React Native Challenge" placeholderTextColor={theme.textSecondary} />
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={screenStyles.label}>Is this an MCQ Test?</Text>
                                <TouchableOpacity
                                    style={[screenStyles.toggleBtn, isMCQ ? { backgroundColor: theme.success } : { backgroundColor: theme.border }]}
                                    onPress={() => setIsMCQ(!isMCQ)}
                                >
                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{isMCQ ? 'YES' : 'NO'}</Text>
                                </TouchableOpacity>
                            </View>

                            {!isMCQ ? (
                                <View style={screenStyles.inputGroup}>
                                    <Text style={screenStyles.label}>Instructions</Text>
                                    <TextInput style={[screenStyles.input, { height: 80, textAlignVertical: 'top' }]} value={testDesc} onChangeText={setTestDesc} placeholder="Write detailed requirements..." placeholderTextColor={theme.textSecondary} multiline />
                                </View>
                            ) : (
                                <View style={screenStyles.mcqBuilder}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>MCQ Builder</Text>
                                    </View>
                                    {mcqQuestions.map((q, idx) => (
                                        <View key={idx} style={{ marginBottom: 20, backgroundColor: 'rgba(51, 65, 85, 0.3)', padding: 16, borderRadius: 12 }}>
                                            <Text style={screenStyles.label}>Question {idx + 1}</Text>
                                            <TextInput
                                                style={[screenStyles.input, { marginBottom: 12 }]}
                                                value={q.question}
                                                onChangeText={txt => { const updated = [...mcqQuestions]; updated[idx].question = txt; setMcqQuestions(updated); }}
                                                placeholder="Enter question text..."
                                                placeholderTextColor={theme.textSecondary}
                                            />
                                            {q.options.map((opt, oIdx) => (
                                                <View key={oIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                                                    <TouchableOpacity
                                                        style={[screenStyles.radioBtn, q.correctIndex === oIdx && screenStyles.radioBtnActive]}
                                                        onPress={() => { const updated = [...mcqQuestions]; updated[idx].correctIndex = oIdx; setMcqQuestions(updated); }}
                                                    >
                                                        {q.correctIndex === oIdx && <Ionicons name="checkmark" size={14} color="#fff" />}
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={[screenStyles.input, { flex: 1, height: 40, padding: 10 }]}
                                                        value={opt}
                                                        onChangeText={txt => { const updated = [...mcqQuestions]; updated[idx].options[oIdx] = txt; setMcqQuestions(updated); }}
                                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                                        placeholderTextColor={theme.textSecondary}
                                                    />
                                                </View>
                                            ))}
                                            <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic', marginTop: 4 }}>* Tick the radio button to mark the correct answer.</Text>
                                        </View>
                                    ))}
                                    <TouchableOpacity style={screenStyles.addMcqBtn} onPress={addMcqQuestion}>
                                        <Ionicons name="add" size={18} color={theme.primary} />
                                        <Text style={{ color: theme.primary, fontWeight: 'bold', marginLeft: 8 }}>Add Question</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={screenStyles.label}>Max Marks</Text>
                                    <TextInput style={screenStyles.input} keyboardType="numeric" value={maxMarks} onChangeText={setMaxMarks} placeholder="100" placeholderTextColor={theme.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={screenStyles.label}>Passing Marks</Text>
                                    <TextInput style={screenStyles.input} keyboardType="numeric" value={passingMarks} onChangeText={setPassingMarks} placeholder="50" placeholderTextColor={theme.textSecondary} />
                                </View>
                            </View>

                            <View style={screenStyles.inputGroup}>
                                <Text style={screenStyles.label}>Deadline (YYYY-MM-DD)</Text>
                                <TextInput style={screenStyles.input} value={testDeadline} onChangeText={setTestDeadline} placeholder="2026-09-30" placeholderTextColor={theme.textSecondary} />
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={screenStyles.submitBtn} onPress={handleAssign} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={screenStyles.submitBtnText}>Dispatch Assessment</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <VideoModal url={videoUrl} visible={videoVisible} onClose={() => setVideoVisible(false)} />
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    addBtn: { backgroundColor: theme.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20, marginTop: 40 },
    emptyText: { color: theme.text, fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    testCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    testTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    candidateName: { color: theme.textSecondary, fontSize: 13, marginBottom: 2 },
    marksInfo: { color: theme.primary, fontSize: 11, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    deadlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, marginBottom: 12 },
    deadlineText: { color: theme.warning, fontSize: 12, fontWeight: '600' },

    commentBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: theme.primary },
    commentLabel: { color: theme.primary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    commentText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },

    reviewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginTop: 12 },
    reviewBtnText: { color: theme.primary, fontSize: 13, fontWeight: 'bold' },

    submissionTextBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: theme.border },
    submissionTextLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    submissionText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },

    evalForm: { marginTop: 16, padding: 16, backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    evalBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    evalText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    evalTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
    evalTriggerText: { color: theme.text, fontSize: 14, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: theme.background, color: theme.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border },
    submitBtn: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    toggleBtn: { marginLeft: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    mcqBuilder: { marginBottom: 16 },
    radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    radioBtnActive: { borderColor: theme.success, backgroundColor: theme.success },
    addMcqBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 12, borderRadius: 12 },
});
