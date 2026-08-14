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

export default function CandidateProfileScreen() {
    const { user } = useAuth();

    // Basic State
    const [objective, setObjective] = useState('');
    const [hasVideo, setHasVideo] = useState(false);
    const [hasCv, setHasCv] = useState(false);

    // Example placeholder saves
    const handleSaveObjective = () => {
        Alert.alert('Saved', 'Career objective updated successfully.');
    };

    const handleUploadCv = () => {
        Alert.alert('Upload CV', 'Feature to select and upload document will launch here.');
        setHasCv(true); // dummy status
    };

    const handleUploadVideo = () => {
        Alert.alert('Video Intro', 'Feature to record or pick a short elevator pitch video.');
        setHasVideo(true); // dummy status
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header Profile Summary */}
            <View style={styles.headerCard}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={56} color="#3b82f6" />
                </View>
                <Text style={styles.userName}>Candidate Name</Text>
                <Text style={styles.userLocation}>Lahore, Punjab</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Career Objective */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="bulb-outline" size={20} color="#38bdf8" />
                    <Text style={styles.sectionTitle}>Career Objective</Text>
                </View>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="I am a software engineer looking for..."
                    placeholderTextColor="#64748b"
                    value={objective}
                    onChangeText={setObjective}
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveObjective}>
                    <Text style={styles.saveButtonText}>Save Objective</Text>
                </TouchableOpacity>
            </View>

            {/* Media & Documents (CV & Video) */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#a855f7" />
                    <Text style={styles.sectionTitle}>Resume & Video Intro</Text>
                </View>

                <View style={styles.mediaRow}>
                    <TouchableOpacity
                        style={[styles.mediaBox, hasCv && styles.mediaBoxSuccess]}
                        onPress={handleUploadCv}
                    >
                        <Ionicons name={hasCv ? "checkmark-circle" : "cloud-upload-outline"} size={32} color={hasCv ? "#22c55e" : "#94a3b8"} />
                        <Text style={styles.mediaText}>{hasCv ? "CV Uploaded" : "Upload CV (PDF)"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.mediaBox, hasVideo && styles.mediaBoxSuccess]}
                        onPress={handleUploadVideo}
                    >
                        <Ionicons name={hasVideo ? "checkmark-circle" : "videocam-outline"} size={32} color={hasVideo ? "#22c55e" : "#94a3b8"} />
                        <Text style={styles.mediaText}>{hasVideo ? "Video Ready" : "Record Intro"}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Experience Section */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderLine}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="briefcase-outline" size={20} color="#f59e0b" />
                        <Text style={styles.sectionTitle}>Experience</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="add-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No work experience added yet.</Text>
                </View>
            </View>

            {/* Education Section */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderLine}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="school-outline" size={20} color="#10b981" />
                        <Text style={styles.sectionTitle}>Education</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="add-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No education records added yet.</Text>
                </View>
            </View>

            {/* Skills Section */}
            <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderLine}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="code-slash-outline" size={20} color="#ef4444" />
                        <Text style={styles.sectionTitle}>Skills</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="add-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No skills added yet.</Text>
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
        borderRadius: 50,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#3b82f6',
        marginBottom: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    userLocation: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#38bdf8',
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
    saveButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    mediaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    mediaBox: {
        flex: 1,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        borderStyle: 'dashed',
        padding: 20,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    mediaBoxSuccess: {
        borderColor: '#22c55e',
        borderStyle: 'solid',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
    },
    mediaText: {
        color: '#94a3b8',
        marginTop: 10,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
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
