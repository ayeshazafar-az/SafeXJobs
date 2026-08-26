import { useAuth } from '@/lib/AuthProvider';
import { checkReminders } from '@/lib/reminderService';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CandidateDashboardScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
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

                    const meta = user.user_metadata || {};

                    let fn = profile.full_name || meta.full_name;
                    if (fn) score += 10;

                    let co = profile.career_objective || meta.career_objective;
                    if (co) score += 20;

                    let sk = profile.skills || meta.skills;
                    if (sk && sk.length > 0) score += 15;

                    let ed = profile.education || meta.education;
                    if (ed && ed.length > 0) score += 15;

                    let ex = profile.experience || meta.experience;
                    if (ex && ex.length > 0) score += 10;

                    let lu = profile.linkedin_url || meta.linkedin_url;
                    if (profile.resume_url || lu) score += 10;

                    setProfileCompletion(score);
                }

                setLoading(false);
            };

            fetchDashboardData();
            if (user) {
                checkReminders(user.id);
            }
        }, [user])
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
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
                    <Ionicons name="notifications-outline" size={24} color={theme.text} />
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
                        <View style={[styles.progressBarFill, { width: `${profileCompletion}%`, backgroundColor: profileCompletion === 100 ? theme.success : '#38bdf8' }]} />
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
                        <Text style={[styles.statNum, { color: theme.success }]}>{stats.hired}</Text>
                        <Text style={styles.statLabel}>Selected</Text>
                    </View>
                </View>

                {/* Upcoming Tasks & Notifications */}
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
                        <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
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
                    <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
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
                    <Ionicons name="arrow-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.card,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    bellBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.background,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.border
    },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },

    content: { padding: 20, paddingBottom: 100 },

    progressCard: {
        backgroundColor: theme.card,
        borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: theme.border,
        marginBottom: 24,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
            android: { elevation: 6 },
        })
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    progressTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    progressValue: { color: '#38bdf8', fontSize: 18, fontWeight: '900' },
    progressBarBg: { height: 8, backgroundColor: theme.background, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressHint: { color: theme.textSecondary, fontSize: 12, marginTop: 12, lineHeight: 18 },

    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: {
        flex: 1, minWidth: '45%',
        backgroundColor: theme.card,
        padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: theme.border,
        alignItems: 'center'
    },
    statNum: { fontSize: 26, fontWeight: '900', color: theme.text, marginBottom: 4 },
    statLabel: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },

    taskCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.card,
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: theme.border
    },
    taskIconWrapper: {
        width: 48, height: 48, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16
    },
    taskTitle: { color: theme.text, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    taskDesc: { color: theme.textSecondary, fontSize: 12, lineHeight: 18, paddingRight: 10 },
    badgeIndicator: {
        position: 'absolute', top: -4, right: -4,
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: theme.danger, borderWidth: 2, borderColor: theme.card
    }
});
