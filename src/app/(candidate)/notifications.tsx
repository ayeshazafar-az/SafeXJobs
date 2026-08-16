import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsScreen() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        const { data, error } = await supabase
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

        // Setup real-time listening
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

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const generateMockAlert = async () => {
        if (!user) return;
        await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'System Welcome',
            message: 'Your profile looks great! Turn on Push Notifications to never miss an interview request.',
            is_read: false
        });
    };

    if (loading) return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Notifications</Text>
                    <Text style={styles.subtitle}>Recent alerts and updates.</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>You're all caught up!</Text>
                        <Text style={styles.emptySubText}>There are no new alerts right now.</Text>

                        {/* Mock Button for Prototype Purposes */}
                        <TouchableOpacity style={styles.demoBtn} onPress={generateMockAlert}>
                            <Text style={styles.demoBtnText}>Generate Demo Alert</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    notifications.map(note => (
                        <TouchableOpacity
                            key={note.id}
                            style={[styles.noteCard, !note.is_read && styles.noteCardUnread]}
                            onPress={() => markAsRead(note.id, note.is_read)}
                        >
                            <View style={[styles.iconBox, !note.is_read ? { backgroundColor: 'rgba(59, 130, 246, 0.2)' } : { backgroundColor: '#1e293b' }]}>
                                <Ionicons name={!note.is_read ? "notifications" : "notifications-outline"} size={24} color={!note.is_read ? "#38bdf8" : "#64748b"} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={[styles.noteTitle, !note.is_read && { color: '#f8fafc' }]}>{note.title}</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    title: { fontSize: 24, fontWeight: '900', color: '#f8fafc' },
    subtitle: { fontSize: 12, color: '#94a3b8' },

    listContent: { padding: 20 },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
    demoBtn: { marginTop: 24, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    demoBtnText: { color: '#fff', fontWeight: 'bold' },

    noteCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: '#334155'
    },
    noteCardUnread: { backgroundColor: '#1e293b', borderColor: '#38bdf8' },

    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    noteTitle: { color: '#94a3b8', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    noteMessage: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, marginBottom: 8 },
    timeText: { color: '#64748b', fontSize: 11 },

    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#38bdf8', position: 'absolute', top: 20, right: 16 }
});
