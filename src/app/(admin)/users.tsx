import { useTheme } from '@/lib/ThemeContext';
import { adminSupabase } from '@/lib/adminSupabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminUsersScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'All' | 'candidate' | 'company' | 'hiring_manager'>('All');

    const loadUsers = async () => {
        setLoading(true);
        const { data, error } = await adminSupabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const toggleSuspendStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Suspended' ? 'Verified' : 'Suspended';
        const { error } = await adminSupabase.from('profiles').update({ status: newStatus }).eq('id', userId);
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
                <Text style={styles.title}>User Directory</Text>
                <Text style={styles.subtitle}>Manage ecosystem members, roles, and security access.</Text>
            </View>

            <View style={styles.statsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Ionicons name="people" size={24} color="#38bdf8" />
                        </View>
                        <Text style={styles.statValue}>{stats.candidates}</Text>
                        <Text style={styles.statLabel}>Candidates</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                            <Ionicons name="business" size={24} color="#a78bfa" />
                        </View>
                        <Text style={styles.statValue}>{stats.companies}</Text>
                        <Text style={styles.statLabel}>Companies</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
                            <Ionicons name="briefcase" size={24} color="#fb923c" />
                        </View>
                        <Text style={styles.statValue}>{stats.managers}</Text>
                        <Text style={styles.statLabel}>HR Managers</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                        </View>
                        <Text style={styles.statValue}>{stats.active}</Text>
                        <Text style={styles.statLabel}>Active Users</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <Ionicons name="ban" size={24} color="#f43f5e" />
                        </View>
                        <Text style={styles.statValue}>{stats.suspended}</Text>
                        <Text style={styles.statLabel}>Suspended</Text>
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
                            {tab === 'candidate' ? 'Candidates' : tab === 'company' ? 'Companies' : tab === 'hiring_manager' ? 'Managers' : 'All Users'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : (
                    filteredUsers.map(user => (
                        <View key={user.id} style={styles.userCard}>
                            <View style={styles.userInfoBlock}>
                                <View style={[styles.avatarPlaceholder,
                                user.role === 'company' ? { backgroundColor: 'rgba(167, 139, 250, 0.15)' } :
                                    user.role === 'hiring_manager' ? { backgroundColor: 'rgba(251, 146, 60, 0.15)' } :
                                        { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                                    <Ionicons
                                        name={user.role === 'company' ? 'business' : user.role === 'hiring_manager' ? 'briefcase' : 'person'}
                                        size={28}
                                        color={user.role === 'company' ? '#a78bfa' : user.role === 'hiring_manager' ? '#fb923c' : '#38bdf8'}
                                    />
                                </View>

                                <View style={styles.userTextMeta}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Text style={styles.userName} numberOfLines={1}>
                                            {user.full_name || user.company_name || 'Anonymous User'}
                                        </Text>
                                        {user.status === 'Suspended' && (
                                            <View style={styles.suspendedMiniBadge}>
                                                <Text style={styles.suspendedMiniText}>SUSPENDED</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                                </View>
                            </View>

                            <View style={styles.actionBlock}>
                                <TouchableOpacity
                                    style={[styles.suspendBtn, user.status === 'Suspended' && styles.unsuspendBtn]}
                                    onPress={() => toggleSuspendStatus(user.id, user.status)}
                                >
                                    <Text style={[styles.suspendBtnText, user.status === 'Suspended' && { color: theme.success }]}>
                                        {user.status === 'Suspended' ? 'Restore Access' : 'Suspend'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
                {filteredUsers.length === 0 && !loading && (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={48} color={theme.border} />
                        <Text style={styles.emptyText}>No users found in this category.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.background,
    },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },

    statsContainer: {
        marginBottom: 8,
    },
    statsScroll: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 16,
    },
    statCard: {
        backgroundColor: theme.card,
        padding: 20,
        borderRadius: 24,
        width: 150,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
            android: { elevation: 6 },
            web: { boxShadow: '0 10px 25px rgba(0,0,0,0.2)' } as any,
        }),
    },
    iconWrapper: {
        width: 48, height: 48,
        borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    statValue: { color: theme.text, fontSize: 28, fontWeight: '900', marginBottom: 4 },
    statLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 10,
    },
    tabBtn: {
        paddingVertical: 10, paddingHorizontal: 20,
        borderRadius: 100,
        backgroundColor: `${theme.border}66`,
    },
    tabBtnActive: {
        backgroundColor: theme.primary,
    },
    tabBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
    tabBtnTextActive: { color: '#ffffff' },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    userCard: {
        backgroundColor: theme.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
            android: { elevation: 3 },
        }),
    },
    userInfoBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: {
        width: 56, height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userTextMeta: { marginLeft: 16, flex: 1, justifyContent: 'center' },
    userName: { color: theme.text, fontSize: 16, fontWeight: '700' },
    userEmail: { color: theme.textSecondary, fontSize: 13, fontWeight: '500' },

    suspendedMiniBadge: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    suspendedMiniText: { color: theme.danger, fontSize: 10, fontWeight: '900' },

    actionBlock: { marginLeft: 16 },
    suspendBtn: {
        paddingVertical: 8, paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)'
    },
    unsuspendBtn: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    suspendBtnText: { color: theme.danger, fontSize: 13, fontWeight: '700' },

    emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { color: theme.textSecondary, marginTop: 16, fontWeight: '500' }
});
