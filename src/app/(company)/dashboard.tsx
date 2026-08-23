import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompanyDashboard() {
    const { user, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState('');
    const [status, setStatus] = useState('Pending');
    const [stats, setStats] = useState({
        totalJobs: 0, activeJobs: 0, closedJobs: 0,
        totalApps: 0, shortlisted: 0, pendingTests: 0,
        upcomingInterviews: 0, hired: 0,
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            const roleCol = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

            // 1. Fetch profile name and status
            const { data: profile, error: profileError } = await supabase.from('profiles').select('company_name, full_name, status').eq('id', user.id).single();
            if (profileError) {
                console.error('[COMPANY] Error fetching profile:', profileError);
                // Don't alert here to avoid annoying user, but we log it
            }
            if (profile) {
                console.log('[COMPANY] Fetched own profile:', profile);
                setCompanyName(profile.company_name || profile.full_name || 'Your Company');
                setStatus(profile.status || 'Pending');
            } else {
                console.log('[COMPANY] Profile not found or blocked by RLS');
            }

            // 2. Fetch jobs
            const { data: jobs } = await supabase.from('jobs').select('id, status').eq(roleCol, user.id);
            const jobIds = jobs?.map(j => j.id) || [];
            const activeJobs = jobs?.filter(j => j.status !== 'Closed').length || 0;
            const closedJobs = jobs?.filter(j => j.status === 'Closed').length || 0;

            // 3. Fetch applications for those jobs
            let totalApps = 0, shortlisted = 0, hired = 0;
            let pendingTests = 0;
            let upcomingInterviews = 0;

            if (jobIds.length > 0) {
                const { data: apps } = await supabase.from('applications').select('status, id').in('job_id', jobIds);
                if (apps && apps.length > 0) {
                    totalApps = apps.length;
                    shortlisted = apps.filter(a => a.status === 'Shortlisted').length;
                    hired = apps.filter(a => a.status === 'Hired').length;

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
                <ActivityIndicator size="large" color="#3b82f6" />
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
                        <Ionicons name="notifications-outline" size={22} color="#f8fafc" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Pending Verification Banner */}
            {status !== 'Verified' && (
                <View style={styles.warningBanner}>
                    <Ionicons name="warning-outline" size={24} color="#f59e0b" />
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
                <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>{stats.totalJobs}</Text>
                    <Text style={styles.statLabel}>Total Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                    <Text style={styles.statValue}>{stats.activeJobs}</Text>
                    <Text style={styles.statLabel}>Active Jobs</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#64748b', borderLeftWidth: 4 }]}>
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
                                <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '500' }}>{label}</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold' }}>{value}</Text>
                            </View>
                            <View style={{ height: 10, backgroundColor: '#334155', borderRadius: 5, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${(value / maxVal) * 100}%`, backgroundColor: color, borderRadius: 5 }} />
                            </View>
                        </View>
                    );

                    return (
                        <>
                            {renderBar('Total Apps', stats.totalApps, '#a855f7')}
                            {renderBar('Shortlisted', stats.shortlisted, '#f59e0b')}
                            {renderBar('Pending Tests', stats.pendingTests, '#38bdf8')}
                            {renderBar('Interviews', stats.upcomingInterviews, '#fb923c')}
                            {renderBar('Hired', stats.hired, '#10b981')}
                        </>
                    );
                })()}
            </View>

            {/* Pipeline Actions */}
            <Text style={styles.sectionHeading}>Pipeline Actions</Text>
            <View style={styles.actionList}>
                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/applications')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#a855f7" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Review Applications</Text>
                        <Text style={styles.actionDesc}>{stats.totalApps} total applications received</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/tests')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="star-outline" size={20} color="#f59e0b" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Candidate Assessments</Text>
                        <Text style={styles.actionDesc}>{stats.pendingTests} pending test submissions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(company)/interviews')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <Ionicons name="videocam-outline" size={20} color="#38bdf8" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Interviews & Meetings</Text>
                        <Text style={styles.actionDesc}>{stats.upcomingInterviews} upcoming interviews</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/(company)/chat')}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="chatbubbles-outline" size={20} color="#10b981" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>Messages</Text>
                        <Text style={styles.actionDesc}>Chat with shortlisted candidates</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerActions: { flexDirection: 'row', gap: 12 },
    title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 6 },
    subtitle: { fontSize: 15, color: '#94a3b8' },
    bellBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#334155',
    },
    logoutButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },

    warningBanner: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 12, padding: 16, marginBottom: 28,
        flexDirection: 'row', alignItems: 'flex-start'
    },
    warningTitle: { color: '#f59e0b', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    warningText: { color: '#fbbf24', fontSize: 13, lineHeight: 20 },

    sectionHeading: { fontSize: 18, fontWeight: '600', color: '#f8fafc', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
    statCard: {
        backgroundColor: '#1e293b', flex: 1, minWidth: '28%',
        padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: '#334155',
    },
    statValue: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    statLabel: { fontSize: 12, color: '#94a3b8' },
    chartContainer: {
        backgroundColor: '#1e293b', padding: 20, borderRadius: 16,
        borderWidth: 1, borderColor: '#334155', marginBottom: 28,
    },
    actionList: {
        backgroundColor: '#1e293b', borderRadius: 16,
        borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
    },
    actionItem: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    actionTextContainer: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '600', color: '#f8fafc', marginBottom: 4 },
    actionDesc: { fontSize: 13, color: '#94a3b8' },
});
