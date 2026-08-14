import { useAuth } from '@/lib/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function CompanyProfileScreen() {
    const { user } = useAuth();

    // Basic State
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');

    const handleSaveProfile = () => {
        Alert.alert('Saved', 'Company profile details updated.');
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header Profile Summary */}
            <View style={styles.headerCard}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="business" size={56} color="#f59e0b" />
                </View>
                <Text style={styles.companyName}>Acme Corp</Text>
                <View style={styles.badgeContainer}>
                    <Ionicons name="checkmark-seal" size={16} color="#10b981" />
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

            {/* Hiring Managers Section */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderLine}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="people-outline" size={20} color="#ec4899" />
                        <Text style={styles.sectionTitle}>Hiring Managers</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="add-circle" size={28} color="#f59e0b" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No additional hiring managers assigned.</Text>
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
});
