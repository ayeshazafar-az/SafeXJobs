import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompanyDashboard() {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Company Dashboard</Text>
                    <Text style={styles.subtitle}>Welcome back, Acme Corp!</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => router.push('/(company)/notifications')} style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={22} color="#f8fafc" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Overview Stats */}
            <Text style={styles.sectionHeading}>Jobs Overview</Text>
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>15</Text>
                    <Text style={styles.statLabel}>Total Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>8</Text>
                    <Text style={styles.statLabel}>Active Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#64748b', borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>7</Text>
                    <Text style={styles.statLabel}>Closed Jobs</Text>
                </View>
            </View>

            {/* Applications Pipeline */}
            <Text style={styles.sectionHeading}>Pipeline Actions</Text>
            <View style={styles.actionList}>
                <View style={styles.actionItem}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#a855f7" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Review Applications</Text>
                        <Text style={styles.actionDesc}>You have 45 pending applications</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>

                <View style={styles.actionItem}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="star-outline" size={20} color="#f59e0b" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Shortlisted Candidates</Text>
                        <Text style={styles.actionDesc}>12 candidates waiting for tests</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>

                <View style={styles.actionItem}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <Ionicons name="videocam-outline" size={20} color="#38bdf8" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Upcoming Interviews</Text>
                        <Text style={styles.actionDesc}>3 interviews scheduled this week</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
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
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
    },
    bellBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    logoutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 10,
        borderRadius: 12,
    },
    sectionHeading: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 36,
    },
    statCard: {
        backgroundColor: '#1e293b',
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#94a3b8',
    },
    actionList: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 13,
        color: '#94a3b8',
    },
});
