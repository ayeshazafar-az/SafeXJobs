import { useAuth } from '@/lib/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { supabase } from '@/lib/supabase';
export default function CompanyProfileScreen() {
    const { user } = useAuth();

    // Basic State
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');

    const handleSaveProfile = () => {
        Alert.alert('Saved', 'Company profile details updated.');
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

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header Profile Summary */}
            <View style={styles.headerCard}>
                <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                    </TouchableOpacity>
                </View>
                <View style={styles.avatarContainer}>
                    <Ionicons name="business" size={56} color="#f59e0b" />
                </View>
                <Text style={styles.companyName}>Acme Corp</Text>
                <View style={styles.badgeContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.badgeText}>Verified Company</Text>
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

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                    <Text style={styles.saveButtonText}>Save Details</Text>
                </TouchableOpacity>
            </View>

            {/* Hiring Managers Section (Step 5 PRD) */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderLine}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="people-outline" size={20} color="#ec4899" />
                        <Text style={styles.sectionTitle}>Hiring Managers</Text>
                    </View>
                </View>

                <Text style={styles.helperText}>Invite recruiters to manage specific job applications.</Text>

                {/* Existing Managers */}
                <View style={styles.managerCard}>
                    <View style={styles.managerHeader}>
                        <Ionicons name="person-circle" size={40} color="#3b82f6" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.managerName}>Ali Khan</Text>
                            <Text style={styles.managerRole}>Technical Recruiter • Engineering</Text>
                        </View>
                    </View>
                    <Text style={styles.assignedJobsText}>Assigned Jobs: Senior React Developer</Text>
                </View>

                {/* Add Manager Form */}
                <View style={styles.addManagerForm}>
                    <Text style={styles.addManagerTitle}>Add New Hiring Manager</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput style={styles.input} placeholder="e.g. Sarah Ahmed" placeholderTextColor="#64748b" />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput style={styles.input} placeholder="sarah@acmecorp.com" placeholderTextColor="#64748b" />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput style={styles.input} placeholder="+92 3XX XXXXXXX" placeholderTextColor="#64748b" keyboardType="phone-pad" />
                    </View>

                    <View style={styles.rowInputs}>
                        <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Designation</Text>
                            <TextInput style={styles.input} placeholder="HR Manager" placeholderTextColor="#64748b" />
                        </View>

                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.label}>Department</Text>
                            <TextInput style={styles.input} placeholder="Marketing" placeholderTextColor="#64748b" />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Assigned Jobs</Text>
                        <TextInput style={styles.input} placeholder="e.g. Senior React Developer" placeholderTextColor="#64748b" />
                    </View>

                    <TouchableOpacity style={styles.inviteButton}>
                        <Ionicons name="mail" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.inviteButtonText}>Send Invitation</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    headerCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#f59e0b',
        marginBottom: 16,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    badgeText: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: '700',
        marginLeft: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#94a3b8',
    },
    sectionCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginLeft: 8,
    },
    textArea: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        color: '#f8fafc',
        padding: 16,
        textAlignVertical: 'top',
        fontSize: 15,
        minHeight: 100,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        color: '#e2e8f0',
        marginBottom: 8,
        fontSize: 13,
        fontWeight: '600',
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
    saveButton: {
        backgroundColor: '#f59e0b',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    emptyState: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    emptyStateText: {
        color: '#64748b',
        fontStyle: 'italic',
    },
    helperText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 16,
    },
    managerCard: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 16,
        marginBottom: 20,
    },
    managerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    managerName: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: 'bold',
    },
    managerRole: {
        color: '#94a3b8',
        fontSize: 13,
    },
    assignedJobsText: {
        color: '#3b82f6',
        fontSize: 13,
        fontWeight: '600',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    addManagerForm: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 20,
    },
    addManagerTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    rowInputs: {
        flexDirection: 'row',
    },
    inviteButton: {
        backgroundColor: '#ec4899',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 8,
    },
    inviteButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    signOutBtn: {
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)'
    }
});
