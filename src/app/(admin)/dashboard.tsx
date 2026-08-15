import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminDashboardScreen() {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Admin Portal</Text>
                    <Text style={styles.subtitle}>Welcome back, System Administrator</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="business" size={28} color="#3b82f6" />
                        <Text style={styles.statNumber}>14</Text>
                        <Text style={styles.statLabel}>Companies</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={28} color="#10b981" />
                        <Text style={styles.statNumber}>128</Text>
                        <Text style={styles.statLabel}>Candidates</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="briefcase" size={28} color="#f59e0b" />
                        <Text style={styles.statNumber}>45</Text>
                        <Text style={styles.statLabel}>Active Jobs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="document-text" size={28} color="#ec4899" />
                        <Text style={styles.statNumber}>892</Text>
                        <Text style={styles.statLabel}>Total Apps</Text>
                    </View>
                </View>

                {/* Verification Section */}
                <Text style={styles.sectionTitle}>Pending Verification</Text>

                <View style={styles.actionCard}>
                    <View style={styles.actionHeader}>
                        <Ionicons name="business-outline" size={32} color="#f59e0b" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.actionName}>Tech Solutions Inc.</Text>
                            <Text style={styles.actionDesc}>Requires Company Approval</Text>
                        </View>
                    </View>
                    <View style={styles.actionsBlock}>
                        <TouchableOpacity style={[styles.btn, { borderColor: '#ef4444', borderWidth: 1 }]}>
                            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#10b981', flex: 1.5 }]}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Approve</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    logoutBtn: {
        padding: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
    },
    content: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 12,
        marginBottom: 4,
    },
    statLabel: {
        color: '#94a3b8',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 24,
        marginBottom: 16,
        marginLeft: 8,
    },
    actionCard: {
        backgroundColor: '#1e293b',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginHorizontal: 8,
    },
    actionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    actionName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    actionDesc: {
        color: '#94a3b8',
        fontSize: 13,
        marginTop: 4,
    },
    actionsBlock: {
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
