import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateProfileScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
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
    const [profilePictureUrl, setProfilePictureUrl] = useState('');

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

                const parseDbArr = (val: any, joiner: string) => {
                    if (!val) return '';
                    if (Array.isArray(val)) return val.join(joiner);
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed.join(joiner);
                    } catch { }
                    return val;
                };

                setSkills(parseDbArr(data.skills, ', '));
                setEducationStr(parseDbArr(data.education, '\n'));
                setExperienceStr(parseDbArr(data.experience, '\n'));
                setCertificationsStr(parseDbArr(data.certifications, '\n'));

                setPhone(data.phone || '');
                setLanguages(data.languages || '');
                setLinkedinUrl(data.linkedin_url || '');
                setPortfolioUrl(data.portfolio_url || '');
                setResumeUrl(data.resume_url || '');
                setVideoUrl(data.video_intro_url || '');
                setProfilePictureUrl(data.profile_picture_url || '');
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
            // We stringify arrays to gracefully handle Supabase text/JSON discrepancies
            skills: JSON.stringify(formattedSkills),
            education: JSON.stringify(formattedEdu),
            experience: JSON.stringify(formattedExp),
            languages,
            linkedin_url: linkedinUrl,
            portfolio_url: portfolioUrl,
            resume_url: resumeUrl,
            video_intro_url: videoUrl,
            certifications: JSON.stringify(formattedCerts),
            profile_picture_url: profilePictureUrl || undefined,
        };

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        setSaving(false);

        if (error) {
            if (Platform.OS === 'web') alert('Error Saving Profile: ' + error.message);
            else Alert.alert('Error Saving Profile', error.message);
        } else {
            if (Platform.OS === 'web') alert('Profile Saved!');
            else Alert.alert('Profile Saved!', 'Your professional portfolio has been updated successfully.');
        }
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

    const uploadToSupabase = async (uri: string, prefix: string, contentType: string, extension: string, oldUrl?: string) => {
        if (!user) return null;
        try {
            if (oldUrl) {
                // Delete orphaned old file to prevent memory leaks in Supabase Storage
                const oldPath = oldUrl.split('/candidate_media/')[1];
                if (oldPath) {
                    await supabase.storage.from('candidate_media').remove([oldPath]);
                }
            }

            const response = await fetch(uri);
            const blob = await response.blob();
            // unique file name to avoid cache issues
            const fileName = `${prefix}/${user.id}_${Date.now()}.${extension}`;

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
            const url = await uploadToSupabase(file.uri, 'resumes', 'application/pdf', 'pdf', resumeUrl);
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

    const handleRecordVideo = () => {
        if (Platform.OS === 'web') {
            // Web doesn't support custom buttons in window.confirm, so jump straight to picker
            processVideoUpload(false);
            return;
        }

        // Ask user if they want to record or pick from gallery
        Alert.alert(
            "Upload Video Intro",
            "Choose a video source (Max 60 seconds)",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Gallery", onPress: () => processVideoUpload(false) },
                { text: "Camera", onPress: () => processVideoUpload(true) }
            ]
        );
    };

    const processVideoUpload = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert("Permission Required", "Please allow camera access to record your intro.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 1,
                    videoMaxDuration: 60,
                });
            } else {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert("Permission Required", "Please allow gallery access to select your intro.");
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 1,
                });
            }

            if (result.canceled || !result.assets[0]) return;

            setUploadingMedia('video');
            const file = result.assets[0];
            const url = await uploadToSupabase(file.uri, 'videos', 'video/mp4', 'mp4', videoUrl);
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

    const handleUploadProfilePicture = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (result.canceled || !result.assets[0]) return;

            setUploadingMedia('picture');
            const url = await uploadToSupabase(result.assets[0].uri, 'profile-pictures', 'image/jpeg', 'jpg', profilePictureUrl);
            if (url) {
                setProfilePictureUrl(url);
                await supabase.from('profiles').update({ profile_picture_url: url }).eq('id', user?.id);
                Alert.alert('Success', 'Profile picture updated.');
            }
        } catch (err) {
            console.error('Profile picture upload error', err);
        } finally {
            setUploadingMedia(null);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
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
                        <Ionicons name="log-out-outline" size={24} color={theme.danger} />
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
                        {/* Profile Picture */}
                        <TouchableOpacity style={styles.avatarContainer} onPress={handleUploadProfilePicture} disabled={uploadingMedia === 'picture'}>
                            {uploadingMedia === 'picture' ? (
                                <View style={styles.avatarCircle}>
                                    <ActivityIndicator color={theme.primary} size="large" />
                                </View>
                            ) : profilePictureUrl ? (
                                <Image source={{ uri: profilePictureUrl }} style={styles.avatarCircle} />
                            ) : (
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitial}>{(fullName || user?.email || '?')[0].toUpperCase()}</Text>
                                </View>
                            )}
                            <View style={styles.cameraOverlay}>
                                <Ionicons name="camera" size={16} color="#fff" />
                            </View>
                            <Text style={styles.avatarHint}>Tap to change photo</Text>
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="John Doe" placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+92 3XX XXXXXXX" placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Province & City</Text>
                            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Islamabad, Capital Territory" placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Career Objective</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                multiline
                                value={careerObjective}
                                onChangeText={setCareerObjective}
                                placeholder="Write a short summary about your goals..."
                                placeholderTextColor={theme.textSecondary}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Languages</Text>
                            <TextInput style={styles.input} value={languages} onChangeText={setLanguages} placeholder="English, Urdu, etc." placeholderTextColor={theme.textSecondary} />
                        </View>
                    </View>
                )}

                {activeSection === 'Professional' && (
                    <View style={styles.formSection}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Skills (Comma Separated)</Text>
                            <TextInput style={styles.input} value={skills} onChangeText={setSkills} placeholder="React, Node.js, Design" placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Education History (One per line)</Text>
                            <TextInput
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                multiline
                                value={educationStr}
                                onChangeText={setEducationStr}
                                placeholder="BS Computer Science - XYZ Univ"
                                placeholderTextColor={theme.textSecondary}
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
                                placeholderTextColor={theme.textSecondary}
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
                                placeholderTextColor={theme.textSecondary}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>LinkedIn Profile URL</Text>
                            <TextInput style={styles.input} value={linkedinUrl} onChangeText={setLinkedinUrl} placeholder="https://linkedin.com/in/..." placeholderTextColor={theme.textSecondary} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Portfolio / Website</Text>
                            <TextInput style={styles.input} value={portfolioUrl} onChangeText={setPortfolioUrl} placeholder="https://github.com/..." placeholderTextColor={theme.textSecondary} />
                        </View>
                    </View>
                )}

                {activeSection === 'Media' && (
                    <View style={styles.formSection}>
                        <View style={styles.mediaCard}>
                            <View style={styles.mediaIconWrapper}>
                                <Ionicons name="document-text" size={32} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.mediaTitle}>Upload CV / Resume</Text>
                                <Text style={styles.mediaDesc}>PDF Only. {resumeUrl ? <Text style={{ color: theme.success, fontWeight: 'bold' }}>Uploaded</Text> : 'Not provided'}</Text>
                            </View>
                            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadResume} disabled={uploadingMedia !== null}>
                                {uploadingMedia === 'resume' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>{resumeUrl ? 'Replace' : 'Upload'}</Text>}
                            </TouchableOpacity>
                        </View>

                        {resumeUrl ? (
                            <TouchableOpacity style={styles.viewLinkBox} onPress={() => Linking.openURL(resumeUrl)}>
                                <Ionicons name="eye-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                                <Text style={{ color: theme.primary, fontSize: 13, fontWeight: 'bold' }}>View Currently Uploaded Resume</Text>
                            </TouchableOpacity>
                        ) : null}

                        <View style={[styles.mediaCard, { marginTop: 16 }]}>
                            <View style={[styles.mediaIconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                                <Ionicons name="videocam" size={32} color={theme.danger} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.mediaTitle}>Video Intro</Text>
                                <Text style={styles.mediaDesc}>Record a 60s intro. {videoUrl ? <Text style={{ color: theme.success, fontWeight: 'bold' }}>Uploaded</Text> : 'Required'}</Text>
                            </View>
                            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: theme.danger }]} onPress={handleRecordVideo} disabled={uploadingMedia !== null}>
                                {uploadingMedia === 'video' ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadBtnText}>{videoUrl ? 'Re-Record' : 'Record'}</Text>}
                            </TouchableOpacity>
                        </View>

                        {videoUrl ? (
                            <TouchableOpacity style={styles.viewLinkBox} onPress={() => Linking.openURL(videoUrl)}>
                                <Ionicons name="eye-outline" size={16} color={theme.danger} style={{ marginRight: 6 }} />
                                <Text style={{ color: theme.danger, fontSize: 13, fontWeight: 'bold' }}>Watch Current Video Intro</Text>
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

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    signOutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },

    segmentedControl: { flexDirection: 'row', padding: 16, gap: 8, backgroundColor: theme.background },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 100, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
    segmentBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    segmentBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
    segmentBtnTextActive: { color: '#ffffff' },

    content: { padding: 20 },
    formSection: { gap: 16 },
    // Avatar Styles
    avatarContainer: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
    avatarCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: theme.border, borderWidth: 2, borderColor: theme.primary,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
    },
    avatarInitial: { fontSize: 36, fontWeight: 'bold', color: theme.textSecondary },
    cameraOverlay: {
        position: 'absolute', bottom: 20, right: '35%',
        backgroundColor: theme.primary, width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: theme.card
    },
    avatarHint: { color: theme.textSecondary, fontSize: 13, marginTop: 8 },

    inputGroup: { marginBottom: 6 },
    label: { color: theme.text, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: theme.card, color: theme.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border },

    mediaCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    mediaIconWrapper: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
    mediaTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    mediaDesc: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
    uploadBtn: { backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    viewLinkBox: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 16 },

    mediaInfoText: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 32, textAlign: 'center', paddingHorizontal: 10 },

    footer: { padding: 20, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border },
    saveBtn: { backgroundColor: theme.success, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
