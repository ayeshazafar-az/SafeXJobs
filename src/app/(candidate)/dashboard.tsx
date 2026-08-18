import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CandidateDashboardScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, shortlisted: 0, interviews: 0, hired: 0, rejected: 0, pendingTests: 0, unreadNotes: 0 });
    const [profileCompletion, setProfileCompletion] = useState(0);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchDashboardData = async () => {
                if (!user) return;

                // 1. Fetch Application Analytics
                const { data: apps } = await supabase
                    .from('applications')
                    .select('status')
                    .eq('candidate_id', user.id);

                if (apps) {
                    setStats(prev => ({
                        ...prev,
                        total: apps.length,
                        shortlisted: apps.filter(a => a.status === 'Shortlisted').length,
                        interviews: apps.filter(a => a.status === 'Interview').length,
                        hired: apps.filter(a => a.status === 'Hired').length,
                        rejected: apps.filter(a => a.status === 'Rejected').length,
                    }));
                }

                // 1.5 Fetch Tests & Notifications Counts
                const [testsRes, notesRes] = await Promise.all([
                    supabase.from('tests').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id).eq('status', 'Pending'),
                    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
                ]);

                setStats(prev => ({
                    ...prev,
                    pendingTests: testsRes.count || 0,
                    unreadNotes: notesRes.count || 0
                }));

                // 2. Fetch Profile Completion Logic
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    let score = 20; // Base score for making an account
                    if (profile.full_name) score += 10;
                    if (profile.career_objective) score += 20;
                    if (profile.skills && profile.skills.length > 0) score += 15;
                    if (profile.education && profile.education.length > 0) score += 15;
                    if (profile.experience && profile.experience.length > 0) score += 10;
                    if (profile.resume_url || profile.linkedin_url) score += 10;
                    setProfileCompletion(score);
                }

                setLoading(false);
            };

            fetchDashboardData();
        }, [user])
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>Overview of your career progress.</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(candidate)/notifications')} style={styles.bellBtn}>
                    <Ionicons name="notifications-outline" size={24} color="#f8fafc" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Completion Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="person-circle" size={24} color="#38bdf8" />
                            <Text style={styles.progressTitle}>Profile Completion</Text>
                        </View>
                        <Text style={styles.progressValue}>{profileCompletion}%</Text>
                    </View>

                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${profileCompletion}%`, backgroundColor: profileCompletion === 100 ? '#10b981' : '#38bdf8' }]} />
                    </View>

                    {profileCompletion < 100 && (
                        <Text style={styles.progressHint}>Complete your profile to increase your chances of getting hired by top companies.</Text>
                    )}
                </View>

                {/* Application Analytics */}
                <Text style={styles.sectionTitle}>Application Summary</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total Apps</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: '#a78bfa' }]}>{stats.shortlisted}</Text>
                        <Text style={styles.statLabel}>Shortlisted</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: '#fb923c' }]}>{stats.interviews}</Text>
                        <Text style={styles.statLabel}>Interviews</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: '#10b981' }]}>{stats.hired}</Text>
                        <Text style={styles.statLabel}>Selected</Text>
                    </View>
                </View>

                {/* Upcoming Tasks & Notifications (Module 20 & 23 placeholder for vertical flow) */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Upcoming Tasks & Action Items</Text>

                {stats.interviews > 0 ? (
                    <TouchableOpacity style={styles.taskCard} onPress={() => router.push('/(candidate)/interviews')}>
                        <View style={[styles.taskIconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.1)' }]}>
                            <Ionicons name="calendar" size={24} color="#fb923c" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.taskTitle}>Upcoming Interview</Text>
                            <Text style={styles.taskDesc}>You have {stats.interviews} interview(s) to prepare for. Check your chat inbox for scheduled times.</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={styles.taskCard} onPress={() => router.push('/(candidate)/tests')}>
                    <View style={[styles.taskIconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <Ionicons name="document-text" size={24} color="#38bdf8" />
                        {stats.pendingTests > 0 && <View style={styles.badgeIndicator} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>Check Test Assignments</Text>
                        <Text style={styles.taskDesc}>
                            {stats.pendingTests > 0 ? `You have ${stats.pendingTests} pending skill assessment(s) to complete.` : 'No pending skill assessments or assignments.'}
                        </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.taskCard, stats.unreadNotes === 0 && { opacity: 0.7 }]} onPress={() => router.push('/(candidate)/notifications')}>
                    <View style={[styles.taskIconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                        <Ionicons name="notifications" size={24} color="#a78bfa" />
                        {stats.unreadNotes > 0 && <View style={styles.badgeIndicator} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>Notifications Center</Text>
                        <Text style={styles.taskDesc}>
                            {stats.unreadNotes > 0 ? `You have ${stats.unreadNotes} unread notification(s).` : 'All caught up! No recent system alerts.'}
                        </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    bellBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#0f172a',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#334155'
    },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },

    content: { padding: 20, paddingBottom: 100 },

    progressCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: '#334155',
        marginBottom: 24,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
            android: { elevation: 6 },
        })
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    progressTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    progressValue: { color: '#38bdf8', fontSize: 18, fontWeight: '900' },
    progressBarBg: { height: 8, backgroundColor: '#0f172a', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressHint: { color: '#94a3b8', fontSize: 12, marginTop: 12, lineHeight: 18 },

    sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', marginBottom: 16 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: {
        flex: 1, minWidth: '45%',
        backgroundColor: '#1e293b',
        padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: '#334155',
        alignItems: 'center'
    },
    statNum: { fontSize: 26, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    taskCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: '#334155'
    },
    taskIconWrapper: {
        width: 48, height: 48, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16
    },
    taskTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    taskDesc: { color: '#94a3b8', fontSize: 12, lineHeight: 18, paddingRight: 10 },
    badgeIndicator: {
        position: 'absolute', top: -4, right: -4,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#1e293b'
    }
});
