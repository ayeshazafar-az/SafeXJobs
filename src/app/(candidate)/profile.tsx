import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateProfileScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'Personal' | 'Professional' | 'Media'>('Personal');

    // Form State
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [careerObjective, setCareerObjective] = useState('');
    const [skills, setSkills] = useState('');
    const [languages, setLanguages] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    const [educationStr, setEducationStr] = useState('');
    const [experienceStr, setExperienceStr] = useState('');
    const [certificationsStr, setCertificationsStr] = useState('');

    useEffect(() => {
        if (!user) return;
        const loadProfile = async () => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setFullName(data.full_name || '');
                setLocation(data.company_location || '');
                setCareerObjective(data.career_objective || '');

                if (data.skills) setSkills(Array.isArray(data.skills) ? data.skills.join(', ') : data.skills);
                if (data.education) setEducationStr(Array.isArray(data.education) ? data.education.join('\n') : data.education);
                if (data.experience) setExperienceStr(Array.isArray(data.experience) ? data.experience.join('\n') : data.experience);
                // We map certifications safely if it exists on the DB, else skip without throwing error
                if (data.certifications) setCertificationsStr(Array.isArray(data.certifications) ? data.certifications.join('\n') : data.certifications);

                setPhone(data.phone || '');
                setLanguages(data.languages || '');
                setLinkedinUrl(data.linkedin_url || '');
                setPortfolioUrl(data.portfolio_url || '');
                setResumeUrl(data.resume_url || '');
                setVideoUrl(data.video_intro_url || '');
            }
            setLoading(false);
        };
        loadProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        const formattedSkills = skills.split(',').map(s => s.trim()).filter(Boolean);
        const formattedEdu = educationStr.split('\n').map(s => s.trim()).filter(Boolean);
        const formattedExp = experienceStr.split('\n').map(s => s.trim()).filter(Boolean);
        const formattedCerts = certificationsStr.split('\n').map(s => s.trim()).filter(Boolean);

        const updates = {
            full_name: fullName,
            phone,
            company_location: location,
            career_objective: careerObjective,
            skills: formattedSkills,
            education: formattedEdu,
            experience: formattedExp,
            languages,
            linkedin_url: linkedinUrl,
            portfolio_url: portfolioUrl,
            resume_url: resumeUrl,
            video_intro_url: videoUrl,
            certifications: formattedCerts
        };

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        setSaving(false);

        if (error) Alert.alert('Error Saving Profile', error.message);
        else Alert.alert('Profile Saved!', 'Your professional portfolio has been updated successfully.');
    };

    const handleSignOut = () => {
        if (Platform.OS === 'web') {
            const isConfirmed = window.confirm("Are you sure you want to sign out?");
            if (isConfirmed) supabase.auth.signOut();
        } else {
            Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Sign Out", style: "destructive", onPress: async () => await supabase.auth.signOut() }
                ]
            );
        }
    };

    const uploadToSupabase = async (uri: string, prefix: string, contentType: string) => {
        if (!user) return null;
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            // unique file name to avoid cache issues
            const fileName = `${prefix}/${user.id}_${Date.now()}`;

            const { data, error } = await supabase.storage
                .from('candidate_media')
                .upload(fileName, blob, {
                    contentType,
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('candidate_media')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message || 'There was an issue uploading your file.');
            return null;
        }
    };

    const handleUploadResume = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets[0]) return;

            setUploadingMedia('resume');
            const file = result.assets[0];
            const url = await uploadToSupabase(file.uri, 'resumes', 'application/pdf');
            if (url) {
                setResumeUrl(url);
                // Auto save the link to profile immediately
                await supabase.from('profiles').update({ resume_url: url }).eq('id', user?.id);
                Alert.alert("Success", "Resume uploaded securely.");
            }
        } catch (err) {
            console.error("Resume upload error", err);
        } finally {
            setUploadingMedia(null);
        }
    };

    const handleRecordVideo = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "Please allow camera access to record your intro.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 60, // 60-second limit as per PRD
            });

            if (result.canceled || !result.assets[0]) return;

            setUploadingMedia('video');
            const file = result.assets[0];
            const url = await uploadToSupabase(file.uri, 'videos', 'video/mp4');
            if (url) {
                setVideoUrl(url);
                await supabase.from('profiles').update({ video_intro_url: url }).eq('id', user?.id);
                Alert.alert("Success", "Video introduction saved.");
            }
        } catch (err) {
            console.error("Video upload error", err);
        } finally {
            setUploadingMedia(null);
        }
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.title}>My Portfolio</Text>
                        <Text style={styles.subtitle}>Complete your profile to attract top hiring managers.</Text>
                    </View>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#f43f5e" />
                    </TouchableOpacity>
                </View>
            </View>

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
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+92 3XX XXXXXXX" placeholderTextColor="#64748b" keyboardType="phone-pad" />
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
                            <Text style={styles.label}>Certifications (One per line)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                multiline
                                value={certificationsStr}
                                onChangeText={setCertificationsStr}
                                placeholder="AWS Solutions Architect (2023)"
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
                                <Text style={styles.mediaDesc}>PDF Only. {resumeUrl ? <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Uploaded</Text> : 'Not provided'}</Text>
                            </View>
                            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadResume} disabled={uploadingMedia !== null}>
                                {uploadingMedia === 'resume' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>{resumeUrl ? 'Replace' : 'Upload'}</Text>}
                            </TouchableOpacity>
                        </View>

                        {resumeUrl ? (
                            <TouchableOpacity style={styles.viewLinkBox} onPress={() => Linking.openURL(resumeUrl)}>
                                <Ionicons name="eye-outline" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: 'bold' }}>View Currently Uploaded Resume</Text>
                            </TouchableOpacity>
                        ) : null}

                        <View style={[styles.mediaCard, { marginTop: 16 }]}>
                            <View style={[styles.mediaIconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                <Ionicons name="videocam" size={32} color="#f43f5e" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.mediaTitle}>Video Intro</Text>
                                <Text style={styles.mediaDesc}>Record a 60s intro. {videoUrl ? <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Uploaded</Text> : 'Required'}</Text>
                            </View>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#f43f5e' }]} onPress={handleRecordVideo} disabled={uploadingMedia !== null}>
                                {uploadingMedia === 'video' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>{videoUrl ? 'Re-Record' : 'Record'}</Text>}
                            </TouchableOpacity>
                        </View>

                        {videoUrl ? (
                            <TouchableOpacity style={styles.viewLinkBox} onPress={() => Linking.openURL(videoUrl)}>
                                <Ionicons name="eye-outline" size={16} color="#f43f5e" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#f43f5e', fontSize: 13, fontWeight: 'bold' }}>Watch Current Video Intro</Text>
                            </TouchableOpacity>
                        ) : null}

                        <Text style={styles.mediaInfoText}>
                            * Media files are securely stored on our servers and only visible to verified Hiring Managers during your application process.
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
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },
    signOutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },

    segmentedControl: { flexDirection: 'row', padding: 16, gap: 8, backgroundColor: '#0f172a' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 100, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
    segmentBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    segmentBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
    segmentBtnTextActive: { color: '#ffffff' },

    content: { padding: 20 },
    formSection: { gap: 16 },
    inputGroup: { marginBottom: 6 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },

    mediaCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    mediaIconWrapper: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
    mediaTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    mediaDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    uploadBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    viewLinkBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 16 },

    mediaInfoText: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 32, textAlign: 'center', paddingHorizontal: 10 },

    footer: { padding: 20, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155' },
    saveBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
