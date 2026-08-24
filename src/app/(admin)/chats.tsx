import { useTheme } from '@/lib/ThemeContext';
import { adminSupabase } from '@/lib/adminSupabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function AdminChatsMonitor() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalChats = async () => {
            setLoading(true);
            const { data } = await adminSupabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles!messages_sender_id_fkey(full_name, role),
                    receiver:profiles!messages_receiver_id_fkey(full_name, role)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) setMessages(data);
            setLoading(false);
        };
        fetchGlobalChats();
    }, []);

    const renderMessage = ({ item }: { item: any }) => (
        <View style={styles.msgCard}>
            <View style={styles.msgHeader}>
                <Text style={styles.participantName}>{item.sender?.full_name || 'Unknown'} <Text style={styles.roleTag}>({item.sender?.role})</Text></Text>
                <Ionicons name="arrow-forward" size={14} color={theme.textSecondary} style={{ marginHorizontal: 8 }} />
                <Text style={styles.participantName}>{item.receiver?.full_name || 'Unknown'} <Text style={styles.roleTag}>({item.receiver?.role})</Text></Text>
            </View>
            <Text style={styles.msgBody}>{item.content || '[Attachment]'}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Global Chat Monitor</Text>
                <Text style={styles.subtitle}>Supervision logs for platform safety.</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No messages found.</Text>}
                />
            )}
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
    subtitle: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    msgCard: { backgroundColor: theme.card, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    msgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
    participantName: { color: theme.text, fontSize: 14, fontWeight: '600' },
    roleTag: { color: theme.textSecondary, fontSize: 12, fontWeight: 'normal' },
    msgBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    timestamp: { color: theme.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'right' },
    emptyText: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 }
});
