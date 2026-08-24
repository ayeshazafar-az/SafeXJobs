import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function CompanyProfileScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile State
    const [companyName, setCompanyName] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [status, setStatus] = useState('Pending'); // Add status

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            // 1. Fetch only columns that actually exist in the DB schema
            const { data, error } = await supabase.from('profiles').select('company_name, website, status').eq('id', user.id).single();
            if (error) {
                console.error('[PROFILE] Error fetching:', error);
            }
            if (data) {
                setCompanyName(data.company_name || 'Your Company');
                setWebsite(data.website || '');
                setStatus(data.status || 'Pending');
            }
            setLoading(false);
        };
        fetchProfile();
    }, [user]);

    const handleUploadLogo = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setSaving(true);
            const asset = result.assets[0];
            const fileExt = asset.name.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${user?.id}_logo.${fileExt}`;
            const filePath = `${user?.id}/${fileName}`;

            let fileBody: any;
            if (Platform.OS === 'web') {
                const res = await fetch(asset.uri);
                fileBody = await res.blob();
            } else {
                fileBody = { uri: asset.uri, name: asset.name, type: asset.mimeType || 'image/jpeg' };
            }

            const { error: uploadError } = await supabase.storage.from('company_logos').upload(filePath, fileBody, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('company_logos').getPublicUrl(filePath);

            await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user?.id);
            setLogoUrl(publicUrl);

            setSaving(false);
            if (Platform.OS === 'web') alert('Logo uploaded successfully.');
            else Alert.alert('Success', 'Company logo updated.');

        } catch (error: any) {
            setSaving(false);
            if (Platform.OS === 'web') alert('Error: ' + error.message);
            else Alert.alert('Upload Failed', error.message);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        const { error } = await supabase.from('profiles').update({
            // company_description: description, // Column doesn't exist yet
            website: website,
        }).eq('id', user?.id);

        setSaving(false);
        if (error) {
            if (Platform.OS === 'web') alert('Update failed: ' + error.message);
            else Alert.alert('Error', error.message);
        } else {
            if (Platform.OS === 'web') alert('Profile saved.');
            else Alert.alert('Saved', 'Company profile details updated.');
        }
    };

    const handleSignOut = () => {
        if (Platform.OS === 'web') {
            const isConfirmed = window.confirm("Are you sure you want to sign out?");
            if (isConfirmed) supabase.auth.signOut();
        } else {
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: async () => await supabase.auth.signOut() }
            ]);
        }
    };

    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header Profile Summary */}
            <View style={styles.headerCard}>
                <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.avatarContainer} onPress={handleUploadLogo} disabled={saving}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                    ) : (
                        <Ionicons name="business" size={56} color={theme.primary} />
                    )}
                    <View style={styles.editIconOverlay}>
                        <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.companyName}>{companyName}</Text>
                <View style={[styles.badgeContainer, status === 'Verified' ? undefined : { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name={status === 'Verified' ? "checkmark-circle" : "time"} size={16} color={status === 'Verified' ? theme.success : theme.warning} />
                    <Text style={[styles.badgeText, status === 'Verified' ? undefined : { color: theme.warning }]}>
                        {status === 'Verified' ? 'Verified Company' : (status === 'Suspended' ? 'Account Suspended' : 'Pending Verification')}
                    </Text>
                </View>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Company Description */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                    <Text style={styles.sectionTitle}>Company Overview</Text>
                </View>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Briefly describe your company culture, mission, and vision..."
                    placeholderTextColor={theme.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                />
            </View>

            {/* Additional Details */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="globe-outline" size={20} color={theme.warning} />
                    <Text style={styles.sectionTitle}>Online Presence</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Website URL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://www.company.com"
                        placeholderTextColor={theme.textSecondary}
                        value={website}
                        onChangeText={setWebsite}
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Details</Text>}
                </TouchableOpacity>
            </View>

            {/* Team Management */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={20} color={theme.success} />
                    <Text style={styles.sectionTitle}>Team Management</Text>
                </View>

                <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>
                    Manage your hiring managers, recruiters, and HR staff who can post jobs and review applications on behalf of your company.
                </Text>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.success, flexDirection: 'row', justifyContent: 'center' }]}
                    onPress={() => router.push('/(company)/managers' as any)}
                >
                    <Ionicons name="settings-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Manage Hiring Team</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    headerCard: { backgroundColor: theme.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.border },
    avatarContainer: { width: 100, height: 100, borderRadius: 20, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.primary, marginBottom: 16, overflow: 'hidden' },
    logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    editIconOverlay: { position: 'absolute', bottom: -5, right: -5, backgroundColor: theme.primary, padding: 6, borderRadius: 12, borderWidth: 2, borderColor: theme.card },
    companyName: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    badgeText: { fontSize: 12, color: theme.success, fontWeight: '700', marginLeft: 4 },
    userEmail: { fontSize: 14, color: theme.textSecondary },

    sectionCard: { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginLeft: 8 },
    textArea: { backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 16, textAlignVertical: 'top', fontSize: 15, minHeight: 100 },
    inputContainer: { marginBottom: 16 },
    label: { color: theme.text, marginBottom: 8, fontSize: 13, fontWeight: '600' },
    input: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 16, color: theme.text, fontSize: 15 },
    saveButton: { backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
    saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
    signOutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' }
});
