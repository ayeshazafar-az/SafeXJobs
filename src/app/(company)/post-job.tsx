import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];
const GENDER_OPTIONS = ['Any', 'Male', 'Female'];

export default function PostJobScreen() {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [department, setDepartment] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [responsibilities, setResponsibilities] = useState('');
    const [benefits, setBenefits] = useState('');
    const [requiredSkills, setRequiredSkills] = useState('');
    const [education, setEducation] = useState('');
    const [experience, setExperience] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [location, setLocation] = useState('');
    const [vacancies, setVacancies] = useState('1');
    const [deadline, setDeadline] = useState('');
    const [gender, setGender] = useState('Any');
    const [ageMin, setAgeMin] = useState('');
    const [ageMax, setAgeMax] = useState('');
    const [loading, setLoading] = useState(false);
    const [jobType, setJobType] = useState('Full-Time');
    const [companyStatus, setCompanyStatus] = useState('Pending');
    const [hiringManagers, setHiringManagers] = useState<any[]>([]);
    const [selectedManager, setSelectedManager] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        supabase.from('profiles').select('status').eq('id', user.id).single()
            .then(({ data }) => { if (data?.status) setCompanyStatus(data.status); });
        supabase.from('profiles').select('id, full_name').eq('role', 'hiring_manager')
            .then(({ data }) => { if (data) setHiringManagers(data); });
    }, [user]);

    if (companyStatus !== 'Verified') {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
                <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 24, borderRadius: 100, marginBottom: 24 }}>
                    <Ionicons name="shield-half" size={64} color="#f59e0b" />
                </View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12, textAlign: 'center' }}>Verification Required</Text>
                <Text style={{ fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24 }}>
                    Your company account is currently <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{companyStatus}</Text>.{'\n\n'}
                    You must be verified by platform administrators before publishing jobs.
                </Text>
            </View>
        );
    }

    const handlePostJob = async () => {
        if (!title || !description) {
            if (Platform.OS === 'web') alert('Please fill in at least the Title and Description.');
            else Alert.alert('Required Fields', 'Please fill in at least the Title and Description.');
            return;
        }

        setLoading(true);

        // Build payload dynamically to avoid sending non-existent columns to PostgREST
        const jobPayload: Record<string, any> = {
            company_id: user?.id,
            title,
            description,
            is_active: true,
            job_type: jobType, // DB column is job_type, not employment_type
        };

        if (department) jobPayload.department = department;
        if (location) jobPayload.location = location;
        if (salaryMin) jobPayload.salary_min = parseInt(salaryMin);
        if (salaryMax) jobPayload.salary_max = parseInt(salaryMax);
        if (selectedManager) jobPayload.hiring_manager_id = selectedManager;

        // The following form fields are NOT saved because they don't exist in the 'jobs' table yet:
        // category, responsibilities, benefits, required_skills, required_education, required_experience, 
        // vacancies, application_deadline, gender_requirement, age_min, age_max, status

        const { error } = await supabase.from('jobs').insert(jobPayload);

        setLoading(false);
        if (error) {
            if (Platform.OS === 'web') alert('Error: ' + error.message);
            else Alert.alert('Error Posting Job', error.message);
            return;
        }

        if (Platform.OS === 'web') alert('Job Published! Your job is now live.');
        else Alert.alert('Job Published!', 'Your job is now live on the platform.');

        // Reset form
        setTitle(''); setDepartment(''); setCategory(''); setDescription('');
        setResponsibilities(''); setBenefits(''); setRequiredSkills('');
        setEducation(''); setExperience(''); setSalaryMin(''); setSalaryMax('');
        setLocation(''); setVacancies('1'); setDeadline(''); setGender('Any');
        setAgeMin(''); setAgeMax('');
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Post a New Job</Text>
                    <Text style={styles.subtitle}>Create a detailed listing to attract top tier talent.</Text>
                </View>

                <View style={styles.formCard}>
                    {/* Basic Info */}
                    <Text style={styles.sectionLabel}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Title *</Text>
                        <TextInput style={styles.input} placeholder="e.g. Senior Frontend Developer" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Department</Text>
                        <TextInput style={styles.input} placeholder="e.g. Engineering, Marketing" placeholderTextColor="#64748b" value={department} onChangeText={setDepartment} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Category</Text>
                        <TextInput style={styles.input} placeholder="e.g. Software Development, Design" placeholderTextColor="#64748b" value={category} onChangeText={setCategory} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput style={styles.input} placeholder="e.g. Remote, Islamabad, Lahore" placeholderTextColor="#64748b" value={location} onChangeText={setLocation} />
                    </View>

                    {/* Employment Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Employment Type</Text>
                        <View style={styles.chipsContainer}>
                            {JOB_TYPES.map((type) => (
                                <TouchableOpacity key={type} style={[styles.chip, jobType === type && styles.chipActive]} onPress={() => setJobType(type)}>
                                    <Text style={[styles.chipText, jobType === type && styles.chipTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Hiring Manager */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Assign Hiring Manager</Text>
                        {hiringManagers.length === 0 ? (
                            <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>No hiring managers registered yet.</Text>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <TouchableOpacity style={[styles.chip, !selectedManager && styles.chipActive, { marginRight: 8 }]} onPress={() => setSelectedManager(null)}>
                                    <Text style={[styles.chipText, !selectedManager && styles.chipTextActive]}>Self-Managed</Text>
                                </TouchableOpacity>
                                {hiringManagers.map(hm => (
                                    <TouchableOpacity key={hm.id} style={[styles.chip, selectedManager === hm.id && styles.chipActive, { marginRight: 8 }]} onPress={() => setSelectedManager(hm.id)}>
                                        <Text style={[styles.chipText, selectedManager === hm.id && styles.chipTextActive]}>{hm.full_name || 'Unnamed'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* Compensation */}
                    <Text style={styles.sectionLabel}>Compensation & Requirements</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Salary Range (PKR)</Text>
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Min" placeholderTextColor="#64748b" keyboardType="numeric" value={salaryMin} onChangeText={setSalaryMin} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max" placeholderTextColor="#64748b" keyboardType="numeric" value={salaryMax} onChangeText={setSalaryMax} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Required Skills</Text>
                        <TextInput style={styles.input} placeholder="e.g. React, Node.js, TypeScript" placeholderTextColor="#64748b" value={requiredSkills} onChangeText={setRequiredSkills} />
                    </View>

                    <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Education</Text>
                            <TextInput style={styles.input} placeholder="e.g. BS/MS" placeholderTextColor="#64748b" value={education} onChangeText={setEducation} />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Experience</Text>
                            <TextInput style={styles.input} placeholder="e.g. 2-5 years" placeholderTextColor="#64748b" value={experience} onChangeText={setExperience} />
                        </View>
                    </View>

                    <View style={styles.rowInputs}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Vacancies</Text>
                            <TextInput style={styles.input} placeholder="1" placeholderTextColor="#64748b" keyboardType="numeric" value={vacancies} onChangeText={setVacancies} />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Deadline (YYYY-MM-DD)</Text>
                            <TextInput style={styles.input} placeholder="2026-09-30" placeholderTextColor="#64748b" value={deadline} onChangeText={setDeadline} />
                        </View>
                    </View>

                    {/* Gender & Age */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Gender Requirement</Text>
                        <View style={styles.chipsContainer}>
                            {GENDER_OPTIONS.map(g => (
                                <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g)}>
                                    <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age Range (Optional)</Text>
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="Min Age" placeholderTextColor="#64748b" keyboardType="numeric" value={ageMin} onChangeText={setAgeMin} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max Age" placeholderTextColor="#64748b" keyboardType="numeric" value={ageMax} onChangeText={setAgeMax} />
                        </View>
                    </View>

                    {/* Detailed Description */}
                    <Text style={styles.sectionLabel}>Job Details</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Description *</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the role, team, and expectations..." placeholderTextColor="#64748b" multiline numberOfLines={5} value={description} onChangeText={setDescription} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Responsibilities</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="List key responsibilities (one per line)..." placeholderTextColor="#64748b" multiline numberOfLines={4} value={responsibilities} onChangeText={setResponsibilities} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Benefits & Perks</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="e.g. Health insurance, remote work, annual bonus..." placeholderTextColor="#64748b" multiline numberOfLines={3} value={benefits} onChangeText={setBenefits} />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handlePostJob} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="rocket" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.submitBtnText}>Publish Job</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { marginBottom: 30 },
    title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
    subtitle: { fontSize: 15, color: '#94a3b8', lineHeight: 22 },
    formCard: {
        backgroundColor: '#1e293b', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#334155',
    },
    sectionLabel: {
        color: '#60a5fa', fontSize: 14, fontWeight: '700', letterSpacing: 0.5,
        marginBottom: 16, marginTop: 8, textTransform: 'uppercase',
    },
    inputGroup: { marginBottom: 20 },
    label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: {
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
        borderRadius: 12, padding: 16, color: '#f8fafc', fontSize: 15,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    },
    chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#ffffff' },
    rowInputs: { flexDirection: 'row' },
    submitBtn: {
        backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 10,
        shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
