import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateTestsScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [submissionUrl, setSubmissionUrl] = useState('');
    const [submissionText, setSubmissionText] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [mcqAnswers, setMcqAnswers] = useState<{ [key: string]: number }>({});

    const fetchTests = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('tests')
            .select(`*, applications!inner ( candidate_id, jobs ( title, profiles!jobs_company_id_fkey (company_name) ) )`)
            .eq('applications.candidate_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setTests(data);
        setLoading(false);
    };

    useEffect(() => { fetchTests(); }, [user]);

    const handleFileUpload = async (testId: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets[0]) return;

            const file = result.assets[0];
            if (file.size && file.size > 10 * 1024 * 1024) {
                if (Platform.OS === 'web') alert('File too large (max 10MB)');
                else Alert.alert('File too large', 'Please select a file under 10MB.');
                return;
            }

            setUploadingFile(true);
            const fileExt = file.name.split('.').pop() || 'tmp';
            const fileName = `test_submissions/${user?.id}/${testId}_${Date.now()}.${fileExt}`;

            // Handle Web vs Native upload
            let fileBody;
            if (Platform.OS === 'web') {
                const res = await fetch(file.uri);
                fileBody = await res.blob();
            } else {
                const base64 = await import('expo-file-system').then(fs => fs.readAsStringAsync(file.uri, { encoding: fs.EncodingType.Base64 }));
                fileBody = Buffer.from(base64, 'base64');
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, fileBody, {
                    contentType: file.mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (uploadError) throw new Error(uploadError.message);

            const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(fileName);

            setSubmissionUrl(urlData.publicUrl);
            setUploadingFile(false);
        } catch (err: any) {
            setUploadingFile(false);
            if (Platform.OS === 'web') alert('Upload failed: ' + err.message);
            else Alert.alert('Upload Failed', err.message);
        }
    };

    const handleSubmit = async (testId: string) => {
        if (!submissionUrl.trim() && !submissionText.trim()) {
            if (Platform.OS === 'web') alert('Please provide either a submission link/file or a written answer.');
            else Alert.alert('Required', 'Please provide either a submission link/file or a written answer.');
            return;
        }

        const test = tests.find(t => t.id === testId);
        if (!test) return;

        let autoMarks = null;
        let finalStatus = 'Submitted';
        let finalSubmissionText = submissionText;

        if (test.description?.startsWith('[MCQ_JSON]')) {
            try {
                const payload = JSON.parse(test.description.replace('[MCQ_JSON]', ''));
                const scorePerQ = (test.max_marks || 100) / payload.questions.length;
                let score = 0;
                payload.questions.forEach((q: any, idx: number) => {
                    if (mcqAnswers[`${testId}_${idx}`] === q.correctIndex) {
                        score += scorePerQ;
                    }
                });
                autoMarks = Math.round(score);
                finalStatus = autoMarks >= (test.passing_marks || 50) ? 'Passed' : 'Failed';
                finalSubmissionText = `[AUTO_GRADED] Scored ${autoMarks} / ${test.max_marks}`;
            } catch (e) {
                console.error("Failed to parse MCQ payload for grading", e);
            }
        }

        const { error } = await supabase
            .from('tests')
            .update({
                status: finalStatus,
                submission_url: submissionUrl || null,
                submission_text: finalSubmissionText || null,
                obtained_marks: autoMarks,
            })
            .eq('id', testId);

        // Update application status to Test Submitted
        if (!error) {
            const test = tests.find(t => t.id === testId);
            if (test) {
                await supabase.from('applications').update({ status: 'Test Submitted' }).eq('id', test.application_id);

                // Notify HM
                const notifTitle = finalStatus === 'Passed' ? 'Candidate Passed MCQ Test' : finalStatus === 'Failed' ? 'Candidate Failed MCQ Test' : 'Test Submitted';
                const notifBody = finalStatus === 'Submitted'
                    ? `A candidate has submitted their assessment for "${test.title}". Ready for your evaluation.`
                    : `Candidate auto-graded result available for "${test.title}". Score: ${autoMarks}`;

                await supabase.from('notifications').insert({
                    user_id: test.assigned_by,
                    title: notifTitle,
                    body: notifBody,
                    type: 'test_submitted',
                });
            }
        }

        if (error) {
            if (Platform.OS === 'web') alert('Submission failed: ' + error.message);
            else Alert.alert('Submission Failed', error.message);
        } else {
            if (Platform.OS === 'web') alert('Your assessment has been submitted for review!');
            else Alert.alert('Success', 'Your assessment has been submitted to the company for review!');
            setSubmissionUrl(''); setSubmissionText('');
            fetchTests();
        }
        setSubmittingId(null);
    };

    const isPastDeadline = (deadlineStr: string) => {
        if (!deadlineStr) return false;
        return new Date(deadlineStr).getTime() < new Date().getTime();
    };

    const countMcqAnswered = (testId: string, totalQs: number) => {
        let count = 0;
        for (let i = 0; i < totalQs; i++) {
            if (mcqAnswers[`${testId}_${i}`] !== undefined) count++;
        }
        return count;
    };

    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Skill Assessments</Text>
                <Text style={styles.subtitle}>Complete tests assigned by Hiring Managers.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {tests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color={theme.border} />
                        <Text style={styles.emptyText}>No pending tests.</Text>
                        <Text style={styles.emptySubText}>If a company requires a skill assessment, it will show up here along with its deadline.</Text>
                    </View>
                ) : (
                    tests.map(test => {
                        const job = test.applications?.jobs;
                        const isPending = test.status === 'Pending';
                        const pastDeadline = isPending && isPastDeadline(test.deadline);
                        const isActiveSubmit = submittingId === test.id;

                        // determine styling
                        let statusColor = '#94a3b8';
                        let bg = 'rgba(148, 163, 184, 0.1)';
                        if (isPending) { statusColor = pastDeadline ? theme.danger : theme.warning; bg = pastDeadline ? 'rgba(244, 63, 94, 0.1)' : 'rgba(251, 146, 60, 0.1)'; }
                        else if (test.status === 'Submitted') { statusColor = theme.primary; bg = 'rgba(59, 130, 246, 0.1)'; }
                        else if (test.status === 'Passed') { statusColor = theme.success; bg = 'rgba(16, 185, 129, 0.1)'; }
                        else if (test.status === 'Failed') { statusColor = theme.danger; bg = 'rgba(244, 63, 94, 0.1)'; }

                        return (
                            <View key={test.id} style={styles.testCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.testTitle}>{test.title}</Text>
                                        <Text style={styles.companyRefs}>{job?.title} at {job?.profiles?.company_name}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>{test.status}</Text>
                                    </View>
                                </View>

                                {test.deadline && (
                                    <View style={styles.deadlineBanner}>
                                        <Ionicons name="time-outline" size={14} color={pastDeadline ? theme.danger : theme.warning} />
                                        <Text style={[styles.deadlineText, { color: pastDeadline ? theme.danger : theme.warning }]}>
                                            {pastDeadline ? 'Deadline Passed: ' : 'Deadline: '}{new Date(test.deadline).toLocaleDateString()}
                                        </Text>
                                    </View>
                                )}

                                {test.max_marks && (
                                    <View style={styles.marksBanner}>
                                        <Text style={styles.marksText}>Total: {test.max_marks} marks • Passing: {test.passing_marks} marks</Text>
                                        {(test.status === 'Passed' || test.status === 'Failed') && test.obtained_marks != null && (
                                            <Text style={styles.scoredText}>You Scored: {test.obtained_marks}</Text>
                                        )}
                                    </View>
                                )}

                                {test.description ? (
                                    test.description.startsWith('[MCQ_JSON]') ? (
                                        <View style={styles.descBox}>
                                            <Text style={styles.descText}>This is a structured MCQ Assessment. Start the submission to view and answer the questions.</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.descBox}>
                                            <Text style={styles.descText}>{test.description}</Text>
                                        </View>
                                    )
                                ) : null}

                                {/* Status Result Block */}
                                {(test.status === 'Passed' || test.status === 'Failed') && test.evaluator_comments && (
                                    <View style={[styles.feedbackBox, test.status === 'Passed' ? { borderLeftColor: theme.success } : { borderLeftColor: theme.danger }]}>
                                        <Text style={[styles.feedbackLabel, test.status === 'Passed' ? { color: theme.success } : { color: theme.danger }]}>Evaluator Feedback:</Text>
                                        <Text style={styles.descText}>{test.evaluator_comments}</Text>
                                    </View>
                                )}

                                {isPending ? (
                                    pastDeadline ? (
                                        <View style={styles.expiredBox}>
                                            <Ionicons name="warning-outline" size={16} color={theme.danger} />
                                            <Text style={styles.expiredText}>The deadline for this assessment has passed. You can no longer submit.</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.submitArea}>
                                            {isActiveSubmit ? (
                                                <View style={styles.submitForm}>
                                                    {test.description?.startsWith('[MCQ_JSON]') ? (
                                                        <View>
                                                            <Text style={styles.submitLabel}>Answer Multiple Choice Questions</Text>
                                                            {(() => {
                                                                try {
                                                                    const payload = JSON.parse(test.description.replace('[MCQ_JSON]', ''));
                                                                    return payload.questions.map((q: any, idx: number) => (
                                                                        <View key={idx} style={styles.mcqQuestionBox}>
                                                                            <Text style={styles.mcqQuestionText}>{idx + 1}. {q.question}</Text>
                                                                            {q.options.map((opt: string, optIdx: number) => {
                                                                                const isSelected = mcqAnswers[`${test.id}_${idx}`] === optIdx;
                                                                                return (
                                                                                    <TouchableOpacity
                                                                                        key={optIdx}
                                                                                        style={styles.mcqOption}
                                                                                        onPress={() => setMcqAnswers(prev => ({ ...prev, [`${test.id}_${idx}`]: optIdx }))}
                                                                                    >
                                                                                        <View style={[styles.mcqRadio, isSelected && styles.mcqRadioActive]}>
                                                                                            {isSelected && <View style={styles.mcqRadioDot} />}
                                                                                        </View>
                                                                                        <Text style={styles.mcqOptionText}>{opt}</Text>
                                                                                    </TouchableOpacity>
                                                                                );
                                                                            })}
                                                                        </View>
                                                                    ));
                                                                } catch (e) {
                                                                    return <Text style={{ color: theme.danger }}>Error loading questions.</Text>;
                                                                }
                                                            })()}
                                                        </View>
                                                    ) : (
                                                        <View>
                                                            <Text style={styles.submitLabel}>Submit your work</Text>
                                                            <View style={styles.uploadRow}>
                                                                <TextInput
                                                                    style={styles.urlInput}
                                                                    placeholder="URL (e.g. GitHub repo)..."
                                                                    placeholderTextColor={theme.textSecondary}
                                                                    value={submissionUrl}
                                                                    onChangeText={setSubmissionUrl}
                                                                />
                                                                <TouchableOpacity style={styles.uploadBtn} onPress={() => handleFileUpload(test.id)} disabled={uploadingFile}>
                                                                    {uploadingFile ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="document-attach" size={20} color="#fff" />}
                                                                </TouchableOpacity>
                                                            </View>
                                                            <TextInput
                                                                style={[styles.urlInput, { height: 100, textAlignVertical: 'top', marginTop: 10 }]}
                                                                placeholder="Or paste your written answer here..."
                                                                placeholderTextColor={theme.textSecondary}
                                                                multiline
                                                                value={submissionText}
                                                                onChangeText={setSubmissionText}
                                                            />
                                                        </View>
                                                    )}

                                                    <View style={styles.submitActionGroup}>
                                                        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleSubmit(test.id)}>
                                                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit Assessment</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubmittingId(null)}>
                                                            <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Cancel</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ) : (
                                                <TouchableOpacity style={styles.startBtn} onPress={() => setSubmittingId(test.id)}>
                                                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                                    <Text style={styles.startBtnText}>Start Submission</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )
                                ) : test.status === 'Submitted' ? (
                                    <View style={styles.submittedBox}>
                                        <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                                        <Text style={styles.submittedText}>Assessement submitted and under review by the hiring team.</Text>
                                    </View>
                                ) : null}
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
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
    emptyText: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: theme.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

    testCard: { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    testTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    companyRefs: { color: theme.textSecondary, fontSize: 13, fontWeight: '500' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    deadlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    deadlineText: { fontSize: 12, fontWeight: '600' },

    marksBanner: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(96, 165, 250, 0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
    marksText: { color: theme.primary, fontSize: 12, fontWeight: '600' },
    scoredText: { color: theme.text, fontSize: 12, fontWeight: 'bold' },

    descBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.border },
    descText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },

    feedbackBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginTop: 8, borderLeftWidth: 3 },
    feedbackLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },

    submitArea: { marginTop: 8 },
    submitLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },

    startBtn: { backgroundColor: theme.primary, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

    submitForm: { backgroundColor: theme.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    uploadRow: { flexDirection: 'row', gap: 10 },
    urlInput: { flex: 1, backgroundColor: theme.card, color: theme.text, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: theme.border, fontSize: 13 },
    uploadBtn: { backgroundColor: theme.primary, width: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    submitActionGroup: { flexDirection: 'row', gap: 10, marginTop: 16 },
    confirmBtn: { flex: 1, backgroundColor: theme.success, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cancelBtn: { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.danger, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    submittedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginTop: 8 },
    submittedText: { color: theme.primary, fontSize: 13, fontWeight: 'bold' },

    expiredBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginTop: 8 },
    expiredText: { color: theme.danger, fontSize: 13, fontWeight: 'bold', flex: 1, lineHeight: 18 },

    mcqQuestionBox: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    mcqQuestionText: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 12, lineHeight: 22 },
    mcqOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: theme.background, borderRadius: 8, marginBottom: 8 },
    mcqOptionText: { color: theme.textSecondary, fontSize: 14, marginLeft: 10, flex: 1 },
    mcqRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.textSecondary, alignItems: 'center', justifyContent: 'center' },
    mcqRadioActive: { borderColor: theme.primary },
    mcqRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }
});
