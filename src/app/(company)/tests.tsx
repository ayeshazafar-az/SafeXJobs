import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CompanyTestsScreen() {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [testTitle, setTestTitle] = useState('');
    const [testDesc, setTestDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        if (!user) return;

        // 1. Fetch assigned tests
        const { data: activeTests } = await supabase
            .from('tests')
            .select(`
                *,
                applications!inner (
                    jobs!inner (company_id, title),
                    profiles!applications_candidate_id_fkey (full_name)
                )
            `)
            .eq('applications.jobs.company_id', user.id)
            .order('created_at', { ascending: false });

        if (activeTests) setTests(activeTests);

        // 2. Fetch all active applications that could receive a test
        const { data: apps } = await supabase
            .from('applications')
            .select(`
                id, 
                status,
                jobs!inner (company_id, title),
                profiles!applications_candidate_id_fkey (full_name)
            `)
            .eq('jobs.company_id', user.id)
            .neq('status', 'Rejected')
            .neq('status', 'Hired');

        if (apps) setApplications(apps);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user, saving]);

    const handleAssign = async () => {
        if (!selectedApp || !testTitle) {
            Alert.alert("Missing Fields", "Please provide a test title.");
            return;
        }
        setSaving(true);

        const { error } = await supabase.from('tests').insert({
            application_id: selectedApp.id,
            title: testTitle,
            description: testDesc
        });

        setSaving(false);
        if (error) {
            Alert.alert('Dispatch Error', error.message);
        } else {
            setModalVisible(false);
            setTestTitle('');
            setTestDesc('');
            Alert.alert('Assessment Assigned', 'The candidate has been notified to complete the test.');
        }
    };

    const openSubmission = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Invalid URL', 'The submission link provided is invalid.'));
    };

    if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Skill Assessments</Text>
                <Text style={styles.subtitle}>Assign and review technical tests for candidates.</Text>
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
                        <Text style={styles.emptyText}>No tests have been assigned yet.</Text>
                    </View>
                ) : (
                    tests.map(test => {
                        const isSubmitted = test.status === 'Submitted';
                        return (
                            <View key={test.id} style={styles.testCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.testTitle}>{test.title}</Text>
                                        <Text style={styles.candidateName}>Candidate: {test.applications?.profiles?.full_name}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, isSubmitted ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(251, 146, 60, 0.1)' }]}>
                                        <Text style={[styles.statusText, { color: isSubmitted ? '#10b981' : '#fb923c' }]}>{test.status}</Text>
                                    </View>
                                </View>

                                {isSubmitted && test.submission_url && (
                                    <TouchableOpacity style={styles.reviewBtn} onPress={() => openSubmission(test.submission_url)}>
                                        <Ionicons name="link" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
                                        <Text style={styles.reviewBtnText}>Review Submission Link</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={styles.modalTitle}>Dispatch New Test</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Candidate Application</Text>
                            <ScrollView style={{ maxHeight: 150, backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155' }}>
                                {applications.map(app => (
                                    <TouchableOpacity
                                        key={app.id}
                                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', backgroundColor: selectedApp?.id === app.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}
                                        onPress={() => setSelectedApp(app)}
                                    >
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>{app.profiles?.full_name}</Text>
                                        <Text style={{ color: '#64748b', fontSize: 11 }}>{app.jobs?.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Test Title</Text>
                            <TextInput style={styles.input} value={testTitle} onChangeText={setTestTitle} placeholder="e.g. React Native Technical Challenge" placeholderTextColor="#64748b" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Instructions / Description</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                value={testDesc} onChangeText={setTestDesc}
                                placeholder="Write the requirements for the test..."
                                placeholderTextColor="#64748b"
                                multiline
                            />
                        </View>

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

    listContent: { padding: 20 },
    sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: 'bold' },
    addBtn: { backgroundColor: '#3b82f6', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20, marginTop: 40 },
    emptyText: { color: '#e2e8f0', fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    testCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    testTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    candidateName: { color: '#94a3b8', fontSize: 13 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    reviewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginTop: 12 },
    reviewBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },

    inputGroup: { marginBottom: 16 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },

    submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
