import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminUsersScreen() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'candidate' | 'company' | 'hiring_manager'>('All');

    const loadUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const toggleSuspendStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Suspended' ? 'Verified' : 'Suspended';
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            loadUsers();
        }
    };

    const getStats = () => {
        return {
            candidates: users.filter(u => u.role === 'candidate').length,
            companies: users.filter(u => u.role === 'company').length,
            managers: users.filter(u => u.role === 'hiring_manager').length,
            suspended: users.filter(u => u.status === 'Suspended').length,
            active: users.filter(u => u.status !== 'Suspended' && u.role !== 'admin').length,
        };
    };

    const stats = getStats();

    const filteredUsers = activeTab === 'All'
        ? users.filter(u => u.role !== 'admin')
        : users.filter(u => u.role === activeTab);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>User Management</Text>
                <Text style={styles.subtitle}>Supervise candidates, companies, and managers.</Text>
            </View>

            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Total Candidates</Text>
                        <Text style={styles.statValue}>{stats.candidates}</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Total Companies</Text>
                        <Text style={styles.statValue}>{stats.companies}</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Hiring Managers</Text>
                        <Text style={styles.statValue}>{stats.managers}</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Active Users</Text>
                        <Text style={styles.statValue}>{stats.active}</Text>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
                        <Text style={styles.statLabel}>Suspended Users</Text>
                        <Text style={styles.statValue}>{stats.suspended}</Text>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.tabContainer}>
                {['All', 'candidate', 'company', 'hiring_manager'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab as any)}
                    >
                        <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                            {tab === 'candidate' ? 'Candidates' : tab === 'company' ? 'Companies' : tab === 'hiring_manager' ? 'Managers' : 'All'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
                ) : (
                    filteredUsers.map(user => (
                        <View key={user.id} style={styles.userCard}>
                            <View style={styles.userInfoBlock}>
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name={user.role === 'company' ? 'business' : 'person'} size={24} color="#94a3b8" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <Text style={styles.userName} numberOfLines={1}>
                                        {user.full_name || user.company_name || 'Anonymous User'}
                                    </Text>
                                    <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>

                                    <View style={styles.badgeRow}>
                                        <View style={styles.roleBadge}>
                                            <Text style={styles.roleBadgeText}>{user.role}</Text>
                                        </View>
                                        {user.status === 'Suspended' && (
                                            <View style={[styles.roleBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                                <Text style={[styles.roleBadgeText, { color: '#ef4444' }]}>Suspended</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={[styles.suspendBtn, user.status === 'Suspended' && styles.unsuspendBtn]}
                                    onPress={() => toggleSuspendStatus(user.id, user.status)}
                                >
                                    <Ionicons
                                        name={user.status === 'Suspended' ? "refresh" : "ban"}
                                        size={18}
                                        color={user.status === 'Suspended' ? "#10b981" : "#ef4444"}
                                    />
                                    <Text style={[styles.suspendBtnText, user.status === 'Suspended' && { color: '#10b981' }]}>
                                        {user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
                {filteredUsers.length === 0 && !loading && (
                    <Text style={styles.emptyText}>No users found in this category.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 16,
        backgroundColor: '#1e293b',
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },
    statsScroll: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    statCard: {
        backgroundColor: '#0f172a',
        padding: 16,
        borderRadius: 12,
        marginRight: 12,
        width: 140,
        borderWidth: 1,
        borderColor: '#334155',
    },
    statLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
    statValue: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    tabBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
    },
    tabBtnActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    tabBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
    tabBtnTextActive: { color: '#fff' },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    userInfoBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    userEmail: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    roleBadge: {
        backgroundColor: '#334155',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleBadgeText: { color: '#cbd5e1', fontSize: 11, textTransform: 'capitalize' },
    actionBlock: { marginLeft: 16 },
    suspendBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    unsuspendBtn: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    suspendBtnText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 }
});
