import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CandidateChatScreen() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch applications that have reached an appropriate stage for chatting 
    // (e.g. Under Review, Shortlisted, Interview, Hired)
    useEffect(() => {
        const fetchConversations = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('applications')
                .select(`
                    id, 
                    status,
                    jobs (
                        title, 
                        company_id,
                        profiles!jobs_company_id_fkey (company_name)
                    )
                `)
                .eq('candidate_id', user.id)
                .neq('status', 'Pending'); // Or allow pending if you want them to chat immediately

            if (data) setConversations(data);
            setLoading(false);
        };
        fetchConversations();
    }, [user]);

    // Fetch messages when a chat is selected
    useEffect(() => {
        if (!activeChat) return;
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('application_id', activeChat.id)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
        };
        fetchMessages();

        // Subscribe to new incoming messages (Real-time Supabase)
        const channel = supabase.channel(`chat_${activeChat.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${activeChat.id}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new]);
                }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeChat]);

    const sendMessage = async () => {
        if (!inputText.trim() || !user || !activeChat) return;

        const newMessage = {
            application_id: activeChat.id,
            sender_id: user.id,
            content: inputText.trim()
        };

        // Optimistic UI update
        const tempMsg = { ...newMessage, id: Date.now().toString(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        setInputText('');

        await supabase.from('messages').insert(newMessage);
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#3b82f6" style={{ flex: 1, backgroundColor: '#0f172a' }} />;
    }

    if (!activeChat) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Messages</Text>
                    <Text style={styles.subtitle}>Chat with Hiring Managers.</Text>
                </View>

                <ScrollView contentContainerStyle={styles.listContent}>
                    {conversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#334155" />
                            <Text style={styles.emptyText}>No active chats available.</Text>
                            <Text style={styles.emptySubText}>Messaging unlocks when a company reviews your profile or shortlists your application.</Text>
                        </View>
                    ) : (
                        conversations.map(conv => (
                            <TouchableOpacity key={conv.id} style={styles.conversationCard} onPress={() => setActiveChat(conv)}>
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="business" size={24} color="#a78bfa" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.companyName}>{conv.jobs?.profiles?.company_name}</Text>
                                    <Text style={styles.jobTitle}>{conv.jobs?.title}</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{conv.status}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
        );
    }

    // Active Chat Interface
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

            {/* Chat Header */}
            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15 }]}>
                <TouchableOpacity onPress={() => setActiveChat(null)} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.chatHeaderCompany}>{activeChat.jobs?.profiles?.company_name}</Text>
                    <Text style={styles.chatHeaderJob}>{activeChat.jobs?.title}</Text>
                </View>
            </View>

            {/* Chat Messages */}
            <ScrollView contentContainerStyle={styles.chatContent}>
                {messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptySubText}>This is the beginning of your conversation with {activeChat.jobs?.profiles?.company_name}.</Text>
                    </View>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                            <View key={msg.id} style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageThem]}>
                                <Text style={[styles.messageText, isMe ? { color: '#fff' } : { color: '#f8fafc' }]}>{msg.content}</Text>
                                <Text style={[styles.timeText, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: '#64748b' }]}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.attachBtn}>
                    <Ionicons name="attach" size={24} color="#94a3b8" />
                </TouchableOpacity>
                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748b"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} onPress={sendMessage} disabled={!inputText.trim()}>
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },

    listContent: { padding: 20 },
    conversationCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: '#334155'
    },
    avatarPlaceholder: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        alignItems: 'center', justifyContent: 'center'
    },
    companyName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    jobTitle: { color: '#94a3b8', fontSize: 13 },
    statusBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },

    emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
    emptyText: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

    // Chat Interface Styles
    chatHeaderCompany: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    chatHeaderJob: { color: '#94a3b8', fontSize: 13 },

    chatContent: { padding: 20, paddingBottom: 40 },
    messageBubble: {
        maxWidth: '80%',
        padding: 12, borderRadius: 16,
        marginBottom: 16,
    },
    messageMe: {
        alignSelf: 'flex-end',
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 4,
    },
    messageThem: {
        alignSelf: 'flex-start',
        backgroundColor: '#1e293b',
        borderWidth: 1, borderColor: '#334155',
        borderBottomLeftRadius: 4,
    },
    messageText: { fontSize: 15, lineHeight: 22 },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

    inputArea: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        backgroundColor: '#1e293b',
        borderTopWidth: 1, borderTopColor: '#334155',
    },
    attachBtn: { padding: 8, marginRight: 8 },
    textInput: {
        flex: 1,
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        maxHeight: 100,
        borderWidth: 1, borderColor: '#334155'
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#3b82f6',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 12
    }
});
