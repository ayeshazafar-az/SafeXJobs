import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateProfileScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<'Personal' | 'Professional' | 'Media'>('Personal');

    // Form State
    const [fullName, setFullName] = useState('');
    const [location, setLocation] = useState('');
    const [careerObjective, setCareerObjective] = useState('');
    const [skills, setSkills] = useState('');
    const [languages, setLanguages] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');

    // (Education and Experience would optimally have dynamic array builders, using strings here for fast prototype representation)
    const [educationStr, setEducationStr] = useState('');
    const [experienceStr, setExperienceStr] = useState('');

    useEffect(() => {
        if (!user) return;
        const loadProfile = async () => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setFullName(data.full_name || '');
                setLocation(data.company_location || ''); // sharing the location column for now
                setCareerObjective(data.career_objective || '');

                // Parse JSONB arrays into comma strings for the form if they exist
                if (data.skills) setSkills(Array.isArray(data.skills) ? data.skills.join(', ') : data.skills);
                if (data.education) setEducationStr(Array.isArray(data.education) ? data.education.join('\n') : data.education);
                if (data.experience) setExperienceStr(Array.isArray(data.experience) ? data.experience.join('\n') : data.experience);

                setLanguages(data.languages || '');
                setLinkedinUrl(data.linkedin_url || '');
                setPortfolioUrl(data.portfolio_url || '');
            }
            setLoading(false);
        };
        loadProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        // Convert comma strings back to simple arrays for JSONB
        const formattedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
        const formattedEdu = educationStr.split('\n').map(s => s.trim()).filter(Boolean);
        const formattedExp = experienceStr.split('\n').map(s => s.trim()).filter(Boolean);

        const updates = {
            full_name: fullName,
            company_location: location,
            career_objective: careerObjective,
            skills: formattedSkills,
            education: formattedEdu,
            experience: formattedExp,
            languages,
            linkedin_url: linkedinUrl,
            portfolio_url: portfolioUrl
        };

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        setSaving(false);

        if (error) Alert.alert('Error Saving Profile', error.message);
        else Alert.alert('Profile Saved!', 'Your professional portfolio has been updated successfully.');
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Portfolio</Text>
                <Text style={styles.subtitle}>Complete your profile to attract top hiring managers.</Text>
            </View>

            {/* Segmented Controller */}
            <View style={styles.segmentedControl}>
                {['Personal', 'Professional', 'Media'].map((section) => (
                    <TouchableOpacity
                        key={section}
                        style={[styles.segmentBtn, activeSection === section && styles.segmentBtnActive]}
                        onPress={() => setActiveSection(section as any)}
                    >
                        <Text style={[styles.segmentBtnText, activeSection === section && styles.segmentBtnTextActive]}>
                            {section}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {activeSection === 'Personal' && (
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="John Doe" placeholderTextColor="#64748b" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Province & City</Text>
                            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Islamabad, Capital Territory" placeholderTextColor="#64748b" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Career Objective</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                multiline
                                value={careerObjective}
                                onChangeText={setCareerObjective}
                                placeholder="Write a short summary about your goals..."
                                placeholderTextColor="#64748b"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Languages</Text>
                            <TextInput style={styles.input} value={languages} onChangeText={setLanguages} placeholder="English, Urdu, etc." placeholderTextColor="#64748b" />
                        </View>
                    </View>
                )}

                {activeSection === 'Professional' && (
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Skills (Comma Separated)</Text>
                            <TextInput style={styles.input} value={skills} onChangeText={setSkills} placeholder="React, Node.js, Design" placeholderTextColor="#64748b" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Education History (One per line)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                multiline
                                value={educationStr}
                                onChangeText={setEducationStr}
                                placeholder="BS Computer Science - XYZ Univ"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Work Experience (One per line)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                multiline
                                value={experienceStr}
                                onChangeText={setExperienceStr}
                                placeholder="Software Eng - Acme Corp (2022-2024)"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>LinkedIn Profile URL</Text>
                            <TextInput style={styles.input} value={linkedinUrl} onChangeText={setLinkedinUrl} placeholder="https://linkedin.com/in/..." placeholderTextColor="#64748b" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Portfolio / Website</Text>
                            <TextInput style={styles.input} value={portfolioUrl} onChangeText={setPortfolioUrl} placeholder="https://github.com/..." placeholderTextColor="#64748b" />
                        </View>
                    </View>
                )}

                {activeSection === 'Media' && (
                    <View style={styles.formSection}>
                        <View style={styles.mediaCard}>
                            <View style={styles.mediaIconWrapper}>
                                <Ionicons name="document-text" size={32} color="#3b82f6" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.mediaTitle}>Upload CV / Resume</Text>
                                <Text style={styles.mediaDesc}>PDF or DOCX (Max 5MB)</Text>
                            </View>
                            <TouchableOpacity style={styles.uploadBtn}>
                                <Text style={styles.uploadBtnText}>Select File</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.mediaCard, { marginTop: 16 }]}>
                            <View style={[styles.mediaIconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                <Ionicons name="videocam" size={32} color="#f43f5e" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.mediaTitle}>Mandatory Video Intro</Text>
                                <Text style={styles.mediaDesc}>Record a 60-second introduction.</Text>
                            </View>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#f43f5e' }]}>
                                <Text style={styles.uploadBtnText}>Record</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.mediaInfoText}>
                            * Media files are securely stored on our servers and only visible to verified Hiring Managers during your application process. Storage integration is pending backend storage bucket links.
                        </Text>
                    </View>
                )}

            </ScrollView>

            {activeSection !== 'Media' && (
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Profile Changes</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155'
    },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },

    segmentedControl: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        backgroundColor: '#0f172a',
    },
    segmentBtn: {
        flex: 1, paddingVertical: 10,
        alignItems: 'center', borderRadius: 100,
        backgroundColor: '#1e293b',
        borderWidth: 1, borderColor: '#334155'
    },
    segmentBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    segmentBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
    segmentBtnTextActive: { color: '#ffffff' },

    content: { padding: 20 },
    formSection: { gap: 16 },
    inputGroup: { marginBottom: 6 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: {
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#334155'
    },

    mediaCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16, padding: 16,
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#334155'
    },
    mediaIconWrapper: {
        width: 60, height: 60, borderRadius: 16,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center'
    },
    mediaTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    mediaDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    uploadBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 8,
    },
    uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    mediaInfoText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 24, textAlign: 'center', paddingHorizontal: 10 },

    footer: {
        padding: 20,
        backgroundColor: '#1e293b',
        borderTopWidth: 1, borderTopColor: '#334155',
    },
    saveBtn: {
        backgroundColor: '#10b981',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
