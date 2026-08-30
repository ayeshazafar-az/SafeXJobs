import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminReportsScreen() {
    const { user, role } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();

    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchComplaints = async () => {
        setLoading(true);
        // We need to fetch complaints and join profiles to see who reported who.
        const { data, error } = await supabase
            .from('complaints')
            .select(`
                *,
                reported_by_profile:profiles!complaints_reported_by_fkey (full_name, role),
                reported_user_profile:profiles!complaints_reported_user_id_fkey (full_name, role, is_suspended)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching complaints:', error);
        } else if (data) {
            setComplaints(data);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        if (role !== 'admin') {
            router.replace('/(auth)/login');
            return;
        }
        fetchComplaints();
    }, [user, role]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchComplaints();
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setUpdatingId(id);
        const { error } = await supabase
            .from('complaints')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            if (Platform.OS === 'web') alert('Error updating complaint: ' + error.message);
            else Alert.alert('Error', error.message);
        } else {
            setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        }
        setUpdatingId(null);
    };

    const handleSuspendUser = async (userId: string, complaintId: string) => {
        if (Platform.OS !== 'web') {
            Alert.alert('Confirm Suspension', 'Are you sure you want to suspend this user?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Suspend', style: 'destructive', onPress: () => executeSuspension(userId, complaintId) }
            ]);
        } else {
            if (window.confirm('Are you sure you want to suspend this user?')) {
                executeSuspension(userId, complaintId);
            }
        }
    };

    const executeSuspension = async (userId: string, complaintId: string) => {
        setUpdatingId(complaintId);
        // Supabase RPC to bypass RLS or Admin can update profiles because they are admin
        const { error } = await supabase
            .from('profiles')
            .update({ is_suspended: true })
            .eq('id', userId);

        if (error) {
            if (Platform.OS === 'web') alert('Error suspending user: ' + error.message);
            else Alert.alert('Error', error.message);
        } else {
            // Also mark complaint as resolved
            await supabase.from('complaints').update({ status: 'Resolved (User Suspended)' }).eq('id', complaintId);
            fetchComplaints();
        }
        setUpdatingId(null);
    };

    const styles = getStyles(theme);

    if (role !== 'admin') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Trust & Safety Hub</Text>
                <Text style={styles.subtitle}>Review user reports and handle platform violations.</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : complaints.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="shield-checkmark-outline" size={64} color={theme.success} />
                        <Text style={styles.emptyText}>All clear! No pending reports.</Text>
                    </View>
                ) : (
                    complaints.map(complaint => (
                        <View key={complaint.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.headerTitleRow}>
                                    <Ionicons name="warning-outline" size={20} color={theme.danger} />
                                    <Text style={styles.idText}>Report #{complaint.id.substring(0, 8)}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: complaint.status === 'Pending' ? 'rgba(251,146,60,0.1)' : 'rgba(34,197,94,0.1)' }]}>
                                    <Text style={[styles.statusText, { color: complaint.status === 'Pending' ? theme.warning : theme.success }]}>{complaint.status}</Text>
                                </View>
                            </View>

                            <View style={styles.detailsBox}>
                                <Text style={styles.detailLabel}>Reported By:</Text>
                                <Text style={styles.detailValue}>{complaint.reported_by_profile?.full_name || 'Unknown'} ({complaint.reported_by_profile?.role || 'Unknown'})</Text>

                                <View style={{ height: 10 }} />

                                <Text style={styles.detailLabel}>Reported User (Accused):</Text>
                                <Text style={styles.detailValue}>
                                    {complaint.reported_user_profile?.full_name || 'Unknown'}
                                    {complaint.reported_user_profile?.is_suspended ? <Text style={{ color: theme.danger }}> [SUSPENDED]</Text> : ''}
                                </Text>
                            </View>

                            <View style={styles.descBox}>
                                <Text style={styles.descTitle}>Complaint Description</Text>
                                <Text style={styles.descText}>{complaint.description}</Text>
                            </View>

                            {complaint.status === 'Pending' && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { borderColor: theme.border, borderWidth: 1 }]}
                                        onPress={() => handleUpdateStatus(complaint.id, 'Dismissed')}
                                        disabled={updatingId === complaint.id}
                                    >
                                        <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
                                    </TouchableOpacity>

                                    {!complaint.reported_user_profile?.is_suspended && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: theme.danger }]}
                                            onPress={() => handleSuspendUser(complaint.reported_user_id, complaint.id)}
                                            disabled={updatingId === complaint.id}
                                        >
                                            {updatingId === complaint.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.actionBtnText, { color: '#fff' }]}>Suspend User</Text>}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: theme.textSecondary },

    listContent: { padding: 20, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: theme.textSecondary, fontSize: 16, marginTop: 16, fontWeight: '600' },

    card: { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    idText: { color: theme.textSecondary, fontSize: 14, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: 'bold' },

    detailsBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    detailLabel: { color: theme.textSecondary, fontSize: 12, marginBottom: 2 },
    detailValue: { color: theme.text, fontSize: 14, fontWeight: '600' },

    descBox: { marginBottom: 20 },
    descTitle: { color: theme.text, fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    descText: { color: theme.textSecondary, fontSize: 14, lineHeight: 22, backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8 },

    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    actionBtnText: { fontSize: 14, fontWeight: 'bold' },
});
