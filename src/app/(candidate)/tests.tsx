import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateTestsScreen() {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Submission State
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [submissionUrl, setSubmissionUrl] = useState('');

    const fetchTests = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('tests')
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
            .order('created_at', { ascending: false });

        if (data) setTests(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTests();
    }, [user]);

    const handleSubmit = async (testId: string) => {
        if (!submissionUrl.trim()) {
            Alert.alert('Required', 'Please provide a valid URL for your test submission (e.g. GitHub repo, Google Drive folder).');
            return;
        }

        const { error } = await supabase
            .from('tests')
            .update({ status: 'Submitted', submission_url: submissionUrl })
            .eq('id', testId);

        if (error) {
            Alert.alert('Submission Failed', error.message);
        } else {
            Alert.alert('Success', 'Your assessment has been submitted to the company for review!');
            setSubmissionUrl('');
            fetchTests(); // Refresh the list
        }
        setSubmittingId(null);
    };

    if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Skill Assessments</Text>
                <Text style={styles.subtitle}>Complete tests assigned by Hiring Managers.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {tests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>No pending tests.</Text>
                        <Text style={styles.emptySubText}>If a company requires a skill assessment, it will show up here along with its deadline.</Text>
                    </View>
                ) : (
                    tests.map(test => {
                        const job = test.applications?.jobs;
                        const isPending = test.status === 'Pending';

                        return (
                            <View key={test.id} style={styles.testCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.testTitle}>{test.title}</Text>
                                        <Text style={styles.companyRefs}>{job?.title} at {job?.profiles?.company_name}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: isPending ? 'rgba(251, 146, 60, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Text style={[styles.statusText, { color: isPending ? '#fb923c' : '#10b981' }]}>{test.status}</Text>
                                    </View>
                                </View>

                                {test.description ? (
                                    <View style={styles.descBox}>
                                        <Text style={styles.descText}>{test.description}</Text>
                                    </View>
                                ) : null}

                                {isPending ? (
                                    <View style={styles.submitArea}>
                                        <Text style={styles.submitLabel}>Submit your work (URL):</Text>
                                        {submittingId === test.id ? (
                                            <View style={styles.submitActionGroup}>
                                                <TextInput
                                                    style={styles.urlInput}
                                                    placeholder="https://github.com/..."
                                                    placeholderTextColor="#64748b"
                                                    value={submissionUrl}
                                                    onChangeText={setSubmissionUrl}
                                                />
                                                <TouchableOpacity style={styles.confirmBtn} onPress={() => handleSubmit(test.id)}>
                                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubmittingId(null)}>
                                                    <Ionicons name="close" size={20} color="#f43f5e" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={styles.startBtn} onPress={() => setSubmittingId(test.id)}>
                                                <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={styles.startBtnText}>Upload Submission Link</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.submittedBox}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                        <Text style={styles.submittedText}>Assessement submitted and under review!</Text>
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

    testCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16, padding: 20,
        marginBottom: 16,
        borderWidth: 1, borderColor: '#334155'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    testTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    companyRefs: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    descBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#475569' },
    descText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },

    submitArea: { marginTop: 8 },
    submitLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 8 },

    startBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

    submitActionGroup: { flexDirection: 'row', gap: 8 },
    urlInput: { flex: 1, backgroundColor: '#0f172a', color: '#fff', borderRadius: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155', fontSize: 13 },
    confirmBtn: { backgroundColor: '#10b981', width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#f43f5e', width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

    submittedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
    submittedText: { color: '#10b981', fontSize: 13, fontWeight: 'bold' }
});
