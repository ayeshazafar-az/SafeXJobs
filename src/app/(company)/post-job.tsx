import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PostJobScreen() {
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [description, setDescription] = useState('');
    const [salary, setSalary] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    const [jobType, setJobType] = useState('Full-Time');
    const [companyStatus, setCompanyStatus] = useState('Pending'); // Mock state representing DB 'status'

    if (companyStatus !== 'Verified') {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
                <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 24, borderRadius: 100, marginBottom: 24 }}>
                    <Ionicons name="shield-half" size={64} color="#f59e0b" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12, textAlign: 'center' }}>Verification Required</Text>
                <Text style={{ fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 }}>
                    Your company account is currently <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{companyStatus}</Text>...{'\n\n'}
                    You must be fully verified and approved by the platform administrators before you are allowed to publish jobs to the public feed.
                </Text>
            </View>
        );
    }

    const handlePostJob = async () => {
        if (!title || !description) {
            Alert.alert('Required Fields', 'Please fill in at least the Title and Description.');
            return;
        }

        setLoading(true);
        // In a fully wired DB, we would insert into the jobs table here
        // Example: await supabase.from('jobs').insert({ title, description, company_id: user.id })
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Job Published!', 'Your job has been published and is now waiting for top candidates.');
            setTitle('');
            setDepartment('');
            setDescription('');
            setSalary('');
            setLocation('');
        }, 800);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                <View style={styles.header}>
                    <Text style={styles.title}>Post a New Job</Text>
                    <Text style={styles.subtitle}>Create a listing to attract top tier talent.</Text>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Senior Frontend Developer"
                            placeholderTextColor="#64748b"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Department</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Engineering, Marketing"
                            placeholderTextColor="#64748b"
                            value={department}
                            onChangeText={setDepartment}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Remote, Islamabad"
                            placeholderTextColor="#64748b"
                            value={location}
                            onChangeText={setLocation}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Type</Text>
                        <View style={styles.chipsContainer}>
                            {['Full-Time', 'Part-Time', 'Contract', 'Internship'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.chip, jobType === type && styles.chipActive]}
                                    onPress={() => setJobType(type)}
                                >
                                    <Text style={[styles.chipText, jobType === type && styles.chipTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Salary Range (PKR/USD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 150,000 - 250,000"
                            placeholderTextColor="#64748b"
                            value={salary}
                            onChangeText={setSalary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the responsibilities, requirements, and benefits..."
                            placeholderTextColor="#64748b"
                            multiline
                            numberOfLines={6}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handlePostJob} disabled={loading}>
                        <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>{loading ? 'Publishing...' : 'Publish Job'}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#94a3b8',
        lineHeight: 22,
    },
    formCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        color: '#f8fafc',
        fontSize: 15,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    chipActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    chipText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#ffffff',
    },
    submitBtn: {
        backgroundColor: '#f59e0b',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 10,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
