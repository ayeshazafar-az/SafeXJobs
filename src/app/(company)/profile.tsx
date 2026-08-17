import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
            const { data, error } = await supabase.from('profiles').select('company_name, company_description, website, logo_url, status').eq('id', user.id).single();
            if (data) {
                setCompanyName(data.company_name || 'Your Company');
                setDescription(data.company_description || '');
                setWebsite(data.website || '');
                setLogoUrl(data.logo_url || null);
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
            company_description: description,
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

    if (loading) return <ActivityIndicator size="large" color="#f59e0b" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header Profile Summary */}
            <View style={styles.headerCard}>
                <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.avatarContainer} onPress={handleUploadLogo} disabled={saving}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                    ) : (
                        <Ionicons name="business" size={56} color="#f59e0b" />
                    )}
                    <View style={styles.editIconOverlay}>
                        <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.companyName}>{companyName}</Text>
                <View style={[styles.badgeContainer, status === 'Verified' ? undefined : { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name={status === 'Verified' ? "checkmark-circle" : "time"} size={16} color={status === 'Verified' ? "#10b981" : "#f59e0b"} />
                    <Text style={[styles.badgeText, status === 'Verified' ? undefined : { color: '#f59e0b' }]}>
                        {status === 'Verified' ? 'Verified Company' : (status === 'Suspended' ? 'Account Suspended' : 'Pending Verification')}
                    </Text>
                </View>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Company Description */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle-outline" size={20} color="#38bdf8" />
                    <Text style={styles.sectionTitle}>Company Overview</Text>
                </View>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Briefly describe your company culture, mission, and vision..."
                    placeholderTextColor="#64748b"
                    value={description}
                    onChangeText={setDescription}
                />
            </View>

            {/* Additional Details */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="globe-outline" size={20} color="#a855f7" />
                    <Text style={styles.sectionTitle}>Online Presence</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Website URL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://www.company.com"
                        placeholderTextColor="#64748b"
                        value={website}
                        onChangeText={setWebsite}
                    />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Details</Text>}
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
    headerCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    avatarContainer: { width: 100, height: 100, borderRadius: 20, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f59e0b', marginBottom: 16, overflow: 'hidden' },
    logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    editIconOverlay: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#f59e0b', padding: 6, borderRadius: 12, borderWidth: 2, borderColor: '#1e293b' },
    companyName: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    badgeText: { fontSize: 12, color: '#10b981', fontWeight: '700', marginLeft: 4 },
    userEmail: { fontSize: 14, color: '#94a3b8' },

    sectionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginLeft: 8 },
    textArea: { backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', padding: 16, textAlignVertical: 'top', fontSize: 15, minHeight: 100 },
    inputContainer: { marginBottom: 16 },
    label: { color: '#e2e8f0', marginBottom: 8, fontSize: 13, fontWeight: '600' },
    input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 16, color: '#f8fafc', fontSize: 15 },
    saveButton: { backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
    saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
    signOutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' }
});
