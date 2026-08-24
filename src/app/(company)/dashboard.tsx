import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompanyDashboard() {
    const { user, role } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [status, setStatus] = useState('Pending');
    const [stats, setStats] = useState({
        totalJobs: 0, activeJobs: 0, closedJobs: 0,
        totalApps: 0, shortlisted: 0, pendingTests: 0,
        upcomingInterviews: 0, hired: 0,
    });
    const [jobAppStats, setJobAppStats] = useState<{ title: string, count: number }[]>([]);
    const [profileCompletion, setProfileCompletion] = useState(0);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            const roleCol = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

            // 1. Fetch profile name and status
            const { data: profile, error: profileError } = await supabase.from('profiles').select('company_name, full_name, status, bio, website_url, avatar_url').eq('id', user.id).single();
            if (profileError) {
                console.error('[COMPANY] Error fetching profile:', profileError);
                // Don't alert here to avoid annoying user, but we log it
            }
            if (profile) {
                console.log('[COMPANY] Fetched own profile:', profile);
                setCompanyName(profile.company_name || profile.full_name || 'Your Company');
                setStatus(profile.status || 'Pending');

                let score = 20; // base score
                if (profile.full_name) score += 10;
                if (profile.company_name) score += 20;
                if (profile.bio) score += 20;
                if (profile.website_url) score += 15;
                if (profile.avatar_url) score += 15;
                setProfileCompletion(score);
            } else {
                console.log('[COMPANY] Profile not found or blocked by RLS');
            }

            // 2. Fetch jobs
            const { data: jobs } = await supabase.from('jobs').select('id, title, status').eq(roleCol, user.id);
            const jobIds = jobs?.map(j => j.id) || [];
            const activeJobs = jobs?.filter(j => j.status !== 'Closed').length || 0;
            const closedJobs = jobs?.filter(j => j.status === 'Closed').length || 0;

            // 3. Fetch applications for those jobs
            let totalApps = 0, shortlisted = 0, hired = 0;
            let pendingTests = 0;
            let upcomingInterviews = 0;

            let appStats: { title: string, count: number }[] = [];

            if (jobIds.length > 0) {
                const { data: apps } = await supabase.from('applications').select('status, id, job_id').in('job_id', jobIds);
                if (apps && apps.length > 0) {
                    totalApps = apps.length;
                    shortlisted = apps.filter(a => a.status === 'Shortlisted').length;
                    hired = apps.filter(a => a.status === 'Hired').length;

                    // Group apps by job
                    const countMap = apps.reduce((acc: any, app: any) => {
                        acc[app.job_id] = (acc[app.job_id] || 0) + 1;
                        return acc;
                    }, {});

                    appStats = Object.keys(countMap).map(jId => {
                        const job = jobs?.find(j => j.id === jId);
                        return { title: job?.title || 'Unknown Job', count: countMap[jId] };
                    }).sort((a, b) => b.count - a.count).slice(0, 5); // top 5

                    const appIds = apps.map(a => a.id);

                    // 4. Fetch pending tests for these applications
                    const { count } = await supabase
                        .from('tests').select('*', { count: 'exact', head: true })
                        .in('application_id', appIds).eq('status', 'Pending');

                    pendingTests = count || 0;

                    // 5. Fetch upcoming interviews for these applications
                    const { count: iCount } = await supabase
                        .from('interviews').select('*', { count: 'exact', head: true })
                        .in('application_id', appIds).eq('status', 'Scheduled');

                    upcomingInterviews = iCount || 0;
                }
            }

            setStats({
                totalJobs: (jobs?.length || 0),
                activeJobs, closedJobs,
                totalApps, shortlisted,
                pendingTests: pendingTests || 0,
                upcomingInterviews: upcomingInterviews || 0,
                hired,
            });

            setJobAppStats(appStats);

            setLoading(false);
        };
        fetchDashboardData();
    }, [user, role]);

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to sign out?')) {
                await supabase.auth.signOut();
            }
        } else {
            const { Alert } = require('react-native');
            Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
            ]);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Company Dashboard</Text>
                    <Text style={styles.subtitle}>Welcome back, {companyName}!</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => router.push('/(company)/notifications')} style={styles.bellBtn}>
                        <Ionicons name="notifications-outline" size={22} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color={theme.danger} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Profile Completion Card */}
            <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="business" size={24} color={theme.primary} />
                        <Text style={styles.progressTitle}>Profile Completion</Text>
                    </View>
                    <Text style={styles.progressValue}>{profileCompletion}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${profileCompletion}%`, backgroundColor: profileCompletion === 100 ? theme.success : theme.primary }]} />
                </View>
                {profileCompletion < 100 && (
                    <Text style={styles.progressHint}>Complete your company profile to attract high-quality candidates.</Text>
                )}
            </View>

            {/* Pending Verification Banner */}
            {status !== 'Verified' && (
                <View style={styles.warningBanner}>
                    <Ionicons name="warning-outline" size={24} color={theme.warning} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.warningTitle}>Pending Verification</Text>
                        <Text style={styles.warningText}>
                            Your organization is currently pending approval from an administrator. You may browse the dashboard, but you cannot post active public jobs until verified.
                        </Text>
                    </View>
                </View>
            )}

            {/* Jobs Overview */}
            <Text style={styles.sectionHeading}>Jobs Overview</Text>
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { borderLeftColor: theme.primary, borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>{stats.totalJobs}</Text>
                    <Text style={styles.statLabel}>Total Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: theme.success, borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>{stats.activeJobs}</Text>
                    <Text style={styles.statLabel}>Active Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: theme.textSecondary, borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>{stats.closedJobs}</Text>
                    <Text style={styles.statLabel}>Closed Jobs</Text>
                </View>
            </View>

            {/* Recruitment Pipeline */}
            <Text style={styles.sectionHeading}>Recruitment Pipeline Analytics</Text>
            <View style={styles.chartContainer}>
                {(() => {
                    const maxVal = Math.max(stats.totalApps, stats.shortlisted, stats.pendingTests, stats.upcomingInterviews, stats.hired, 1);
                    const renderBar = (label: string, value: number, color: string) => (
                        <View style={{ marginBottom: 16 }} key={label}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: 'bold' }}>{value}</Text>
                            </View>
                            <View style={{ height: 10, backgroundColor: theme.background, borderRadius: 5, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${(value / maxVal) * 100}%`, backgroundColor: color, borderRadius: 5 }} />
                            </View>
                        </View>
                    );

                    return (
                        <>
                            {renderBar('Total Apps', stats.totalApps, theme.primary)}
                            {renderBar('Shortlisted', stats.shortlisted, theme.warning)}
                            {renderBar('Pending Tests', stats.pendingTests, theme.warning)}
                            {renderBar('Interviews', stats.upcomingInterviews, theme.warning)}
                            {renderBar('Hired', stats.hired, theme.success)}
                        </>
                    );
                })()}
            </View>

            {/* Applications per Job Chart */}
            {jobAppStats.length > 0 && (
                <>
                    <Text style={styles.sectionHeading}>Top Jobs by Applications</Text>
                    <View style={styles.chartContainer}>
                        {(() => {
                            const maxVal = Math.max(...jobAppStats.map(j => j.count), 1);
                            return jobAppStats.map((item, idx) => (
                                <View style={{ marginBottom: 16 }} key={idx}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500', flex: 1 }} numberOfLines={1}>{item.title}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: 'bold', marginLeft: 10 }}>{item.count}</Text>
                                    </View>
                                    <View style={{ height: 10, backgroundColor: theme.background, borderRadius: 5, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', width: `${(item.count / maxVal) * 100}%`, backgroundColor: theme.warning, borderRadius: 5 }} />
                                    </View>
                                </View>
                            ));
                        })()}
                    </View>
                </>
            )}

            {/* Pipeline Actions */}
            <Text style={styles.sectionHeading}>Pipeline Actions</Text>
            <View style={styles.actionList}>
                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/applications')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                        <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Review Applications</Text>
                        <Text style={styles.actionDesc}>{stats.totalApps} total applications received</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/tests')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="star-outline" size={20} color={theme.warning} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Candidate Assessments</Text>
                        <Text style={styles.actionDesc}>{stats.pendingTests} pending test submissions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/interviews')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <Ionicons name="videocam-outline" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Interviews & Meetings</Text>
                        <Text style={styles.actionDesc}>{stats.upcomingInterviews} upcoming interviews</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/(company)/chat')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="chatbubbles-outline" size={20} color={theme.success} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Messages</Text>
                        <Text style={styles.actionDesc}>Chat with shortlisted candidates</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerActions: { flexDirection: 'row', gap: 12 },
    title: { fontSize: 28, fontWeight: '800', color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 15, color: theme.textSecondary },
    bellBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.border,
    },
    logoutButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },

    warningBanner: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 12, padding: 16, marginBottom: 28,
        flexDirection: 'row', alignItems: 'flex-start'
    },
    warningTitle: { color: theme.warning, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    warningText: { color: theme.warning, fontSize: 13, lineHeight: 20 },

    sectionHeading: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12, marginTop: 8 },

    progressCard: { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressTitle: { color: theme.text, fontSize: 15, fontWeight: 'bold' },
    progressValue: { color: theme.primary, fontSize: 15, fontWeight: 'bold' },
    progressBarBg: { height: 8, backgroundColor: theme.background, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressHint: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: {
        backgroundColor: theme.card, flex: 1, minWidth: '28%',
        padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: theme.border,
    },
    statValue: { fontSize: 26, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    statLabel: { fontSize: 12, color: theme.textSecondary },
    chartContainer: {
        backgroundColor: theme.card, padding: 20, borderRadius: 16,
        borderWidth: 1, borderColor: theme.border, marginBottom: 28,
    },
    actionList: {
        backgroundColor: theme.card, borderRadius: 16,
        borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
    },
    actionItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    actionTextContainer: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 4 },
    actionDesc: { fontSize: 13, color: theme.textSecondary },
});
