import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CompanyNotificationsScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setNotifications(data);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchNotifications();

        const channel = supabase.channel(`notifications_${user?.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string, isRead: boolean) => {
        if (isRead) return;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };



    if (loading) return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Company Alerts</Text>
                    <Text style={styles.subtitle}>Important updates on your talent pipeline.</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color={theme.border} />
                        <Text style={styles.emptyText}>Inbox Zero!</Text>
                        <Text style={styles.emptySubText}>You will receive alerts here when candidates apply to your jobs or submit skill assessments.</Text>
                    </View>
                ) : (
                    notifications.map(note => (
                        <TouchableOpacity
                            key={note.id}
                            style={[styles.noteCard, !note.is_read && styles.noteCardUnread]}
                            onPress={() => markAsRead(note.id, note.is_read)}
                        >
                            <View style={[styles.iconBox, !note.is_read ? { backgroundColor: 'rgba(59, 130, 246, 0.2)' } : { backgroundColor: theme.card }]}>
                                <Ionicons name={!note.is_read ? "briefcase" : "briefcase-outline"} size={24} color={!note.is_read ? theme.primary : theme.textSecondary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={[styles.noteTitle, !note.is_read && { color: theme.text }]}>{note.title}</Text>
                                <Text style={styles.noteMessage}>{note.message}</Text>
                                <Text style={styles.timeText}>{new Date(note.created_at).toLocaleString()}</Text>
                            </View>
                            {!note.is_read && <View style={styles.unreadDot} />}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        flexDirection: 'row', alignItems: 'center',
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.card,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    title: { fontSize: 24, fontWeight: '900', color: theme.text },
    subtitle: { fontSize: 12, color: theme.textSecondary },

    listContent: { padding: 20 },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: theme.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },

    noteCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.background,
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: theme.border
    },
    noteCardUnread: { backgroundColor: theme.card, borderColor: theme.primary },

    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    noteTitle: { color: theme.textSecondary, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    noteMessage: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 8 },
    timeText: { color: theme.textSecondary, fontSize: 11 },

    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary, position: 'absolute', top: 20, right: 16 }
});
