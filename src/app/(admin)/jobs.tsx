import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminJobsScreen() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [appStats, setAppStats] = useState({ total: 0, shortlisted: 0, tests: 0, interviews: 0, hired: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Jobs' | 'Applications'>('Jobs');

    const loadData = async () => {
        setLoading(true);
        const { data: jobData } = await supabase.from('jobs').select('*');
        if (jobData) setJobs(jobData);

        const { data: appData } = await supabase.from('applications').select('status');
        if (appData) {
            setAppStats({
                total: appData.length,
                shortlisted: appData.filter(a => a.status === 'Shortlisted').length,
                tests: appData.filter(a => a.status === 'Test Assigned').length,
                interviews: appData.filter(a => a.status === 'Interview').length,
                hired: appData.filter(a => a.status === 'Hired').length,
                rejected: appData.filter(a => a.status === 'Rejected').length,
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const jobStats = {
        total: jobs.length,
        active: jobs.filter(j => j.status !== 'Closed').length,
        closed: jobs.filter(j => j.status === 'Closed').length,
        pending: jobs.filter(j => j.status === 'Pending Approval').length,
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Jobs & Applications</Text>
                <Text style={styles.subtitle}>Moderate platform listings and candidate applications.</Text>
            </View>

            <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Job Statistics</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Ionicons name="briefcase" size={24} color="#38bdf8" />
                        </View>
                        <Text style={styles.statValue}>{jobStats.total}</Text>
                        <Text style={styles.statLabel}>Total Jobs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="flash" size={24} color="#10b981" />
                        </View>
                        <Text style={styles.statValue}>{jobStats.active}</Text>
                        <Text style={styles.statLabel}>Active Jobs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <Ionicons name="lock-closed" size={24} color="#f43f5e" />
                        </View>
                        <Text style={styles.statValue}>{jobStats.closed}</Text>
                        <Text style={styles.statLabel}>Closed Jobs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
                            <Ionicons name="time" size={24} color="#fb923c" />
                        </View>
                        <Text style={styles.statValue}>{jobStats.pending}</Text>
                        <Text style={styles.statLabel}>Pending Approval</Text>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Application Statistics</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.total}</Text>
                        <Text style={[styles.statLabel, { color: '#38bdf8' }]}>Total Apps</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.shortlisted}</Text>
                        <Text style={[styles.statLabel, { color: '#a78bfa' }]}>Shortlisted</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.tests}</Text>
                        <Text style={[styles.statLabel, { color: '#fb923c' }]}>Tests</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.interviews}</Text>
                        <Text style={[styles.statLabel, { color: '#34d399' }]}>Interviews</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.hired}</Text>
                        <Text style={[styles.statLabel, { color: '#10b981' }]}>Hired</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{appStats.rejected}</Text>
                        <Text style={[styles.statLabel, { color: '#f43f5e' }]}>Rejected</Text>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.tabContainer}>
                {['Jobs', 'Applications'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab as any)}
                    >
                        <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                            {tab} Directory
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-checkmark" size={48} color="#334155" />
                        <Text style={styles.emptyText}>Moderation board ready.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#0f172a',
    },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },

    sectionDivider: { marginBottom: 12 },
    sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
    statsScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    statCard: {
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 20,
        width: 140,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
            android: { elevation: 6 },
            web: { boxShadow: '0 8px 20px rgba(0,0,0,0.2)' } as any,
        }),
    },
    iconWrapper: {
        width: 40, height: 40,
        borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: { color: '#f8fafc', fontSize: 24, fontWeight: '900', marginBottom: 4 },
    statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        marginTop: 12,
        gap: 10,
    },
    tabBtn: {
        paddingVertical: 10, paddingHorizontal: 20,
        borderRadius: 100,
        backgroundColor: 'rgba(51, 65, 85, 0.4)',
    },
    tabBtnActive: { backgroundColor: '#3b82f6' },
    tabBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
    tabBtnTextActive: { color: '#ffffff' },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
    emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '500' }
});
