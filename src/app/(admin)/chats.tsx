import { adminSupabase } from '@/lib/adminSupabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function AdminChatsMonitor() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGlobalChats = async () => {
            setLoading(true);
            // using adminSupabase bypasses RLS
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
                <Ionicons name="arrow-forward" size={14} color="#64748b" style={{ marginHorizontal: 8 }} />
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
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    msgCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    msgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
    participantName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
    roleTag: { color: '#94a3b8', fontSize: 12, fontWeight: 'normal' },
    msgBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
    timestamp: { color: '#64748b', fontSize: 11, marginTop: 8, textAlign: 'right' },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 }
});
