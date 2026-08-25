import { adminSupabase } from '@/lib/adminSupabase';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CompanyManagersScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [designation, setDesignation] = useState('');
    const [department, setDepartment] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchManagers = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', user.id)
            .eq('role', 'hiring_manager');

        if (data) setManagers(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchManagers();
    }, [user]);

    const handleCreateManager = async () => {
        if (!name || !email || !password) {
            if (Platform.OS === 'web') alert('Please fill name, email, and password');
            else Alert.alert('Required Fields', 'Please fill name, email, and password.');
            return;
        }

        if (password.length < 6) {
            if (Platform.OS === 'web') alert('Password must be at least 6 characters');
            else Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }

        setSaving(true);
        try {
            // Securely create the user account using admin credentials
            const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
                email: email.trim(),
                password: password,
                email_confirm: true // bypass email confirmation 
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Failed to create user auth record");

            const newUserId = authData.user.id;

            // Wait a second for Supabase triggers to create the default 'profiles' row
            await new Promise(r => setTimeout(r, 1000));

            // Upsert the profiles row with the company link
            const profilePayload: any = {
                id: newUserId,
                role: 'hiring_manager',
                full_name: name,
                email: email.trim(),
                company_id: user?.id,
                status: 'Verified'
            };
            // Remove designation and department from profilePayload since they don't exist in DB schema
            // which causes a strict rejection

            const { error: profileError } = await adminSupabase.from('profiles').upsert(profilePayload);
            if (profileError) throw profileError;

            // Successfully created! Update local state
            setManagers(prev => [{ ...profilePayload, designation, department }, ...prev]);
            setModalVisible(false);

            // Reset form
            setName(''); setEmail(''); setPassword(''); setDesignation(''); setDepartment('');

            if (Platform.OS === 'web') alert('Hiring Manager added successfully!');
            else Alert.alert('Success', 'Hiring Manager has been created. They can now log in.');

        } catch (e: any) {
            console.error('Create manager error:', e);
            if (Platform.OS === 'web') alert('Error: ' + e.message);
            else Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Hiring Managers</Text>
                <Text style={styles.subtitle}>Manage your HR and recruiting team.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={styles.sectionTitle}>Your Team</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Add Manager</Text>
                    </TouchableOpacity>
                </View>

                {managers.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={theme.border} />
                        <Text style={styles.emptyText}>No hiring managers created yet.</Text>
                    </View>
                ) : (
                    managers.map(manager => (
                        <View key={manager.id} style={styles.managerCard}>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{(manager.full_name || 'H')[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.managerName}>{manager.full_name || 'Unnamed Manager'}</Text>
                                <Text style={styles.managerEmail}>{manager.email}</Text>
                                <View style={styles.tagRow}>
                                    {manager.designation && <View style={styles.tag}><Text style={styles.tagText}>{manager.designation}</Text></View>}
                                    {manager.department && <View style={styles.tag}><Text style={styles.tagText}>{manager.department}</Text></View>}
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={styles.modalTitle}>Create Hiring Manager</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name *</Text>
                                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. John Doe" placeholderTextColor={theme.textSecondary} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address *</Text>
                                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="manager@company.com" autoCapitalize="none" keyboardType="email-address" placeholderTextColor={theme.textSecondary} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Internal Password *</Text>
                                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Must be at least 6 characters" secureTextEntry placeholderTextColor={theme.textSecondary} />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Designation</Text>
                                    <TextInput style={styles.input} value={designation} onChangeText={setDesignation} placeholder="e.g. Lead Recruiter" placeholderTextColor={theme.textSecondary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Department</Text>
                                    <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="e.g. Engineering" placeholderTextColor={theme.textSecondary} />
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateManager} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Account</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    addBtn: { flexDirection: 'row', backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
    emptyContainer: { alignItems: 'center', opacity: 0.5, padding: 20, marginTop: 40 },
    emptyText: { color: theme.textSecondary, fontSize: 14, fontWeight: 'bold', marginTop: 10 },

    managerCard: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.primary, fontSize: 20, fontWeight: 'bold' },
    managerName: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    managerEmail: { color: theme.textSecondary, fontSize: 13, marginBottom: 8 },
    tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    tag: { backgroundColor: theme.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border },
    tagText: { color: theme.textSecondary, fontSize: 10, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: theme.text, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: theme.background, color: theme.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border },
    submitBtn: { backgroundColor: theme.success, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
