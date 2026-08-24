import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CompanyChatScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch applications for this company's jobs that are active chats
    useEffect(() => {
        const fetchConversations = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('applications')
                .select(`
                    id, 
                    status,
                    candidate_id,
                    jobs!inner (
                        title, 
                        company_id
                    ),
                    profiles!applications_candidate_id_fkey (
                        full_name,
                        career_objective
                    )
                `)
                .eq('jobs.company_id', user.id)
                .neq('status', 'Pending'); // Usually, companies only chat with shortlisted/interview candidates

            if (data) setConversations(data);
            setLoading(false);
        };
        fetchConversations();
    }, [user]);

    // Fetch messages when a chat is selected
    useEffect(() => {
        if (!activeChat || !user) return;
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('application_id', activeChat.id)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);

                // Mark unread messages from candidate as read
                const unread = data.filter(m => m.sender_id !== user.id && !m.content.endsWith('[READ]'));
                for (const msg of unread) {
                    await supabase.from('messages').update({ content: msg.content + '[READ]' }).eq('id', msg.id);
                }
            }
        };
        fetchMessages();

        // Subscribe to real-time incoming messages
        const channel = supabase.channel(`company_chat_${activeChat.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `application_id=eq.${activeChat.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setMessages(prev => {
                            if (prev.find(m => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });

                        // Mark new unread messages as read
                        if (payload.new.sender_id !== user.id && !payload.new.content.endsWith('[READ]')) {
                            supabase.from('messages').update({ content: payload.new.content + '[READ]' }).eq('id', payload.new.id);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    }
                }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeChat, user]);

    const sendMessage = async () => {
        if (!inputText.trim() || !user || !activeChat) return;

        const newMessage = {
            application_id: activeChat.id,
            sender_id: user.id,
            content: inputText.trim()
        };

        const tempMsg = { ...newMessage, id: Date.now().toString(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        setInputText('');

        await supabase.from('messages').insert(newMessage);
    };

    const handleAttach = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets[0]) return;

            setIsUploading(true);
            const asset = result.assets[0];
            const ext = asset.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: fileName, type: asset.mimeType } as any);

            const { data, error } = await supabase.storage
                .from('candidate_media')
                .upload(`chat_attachments/${fileName}`, formData);

            if (error) {
                console.warn('Supabase storage error:', error);
                Alert.alert('Upload Failed', 'Storage backend is not configured for chat attachments.');
            } else {
                const { data: { publicUrl } } = supabase.storage.from('candidate_media').getPublicUrl(`chat_attachments/${fileName}`);

                const newMessage = {
                    application_id: activeChat.id,
                    sender_id: user?.id,
                    content: `[ATTACHMENT]${publicUrl}`
                };

                const tempMsg = { ...newMessage, id: Date.now().toString(), created_at: new Date().toISOString() };
                setMessages(prev => [...prev, tempMsg]);
                await supabase.from('messages').insert(newMessage);
            }
        } catch (e) {
            console.error('Attachment error', e);
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, backgroundColor: theme.background }} />;
    }

    if (!activeChat) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Candidate Messaging</Text>
                    <Text style={styles.subtitle}>Directly communicate with shortlisted talent.</Text>
                </View>

                <ScrollView contentContainerStyle={styles.listContent}>
                    {conversations.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={theme.border} />
                            <Text style={styles.emptyText}>No active chats available.</Text>
                            <Text style={styles.emptySubText}>Shortlist a candidate in your Applications tab to unlock direct messaging.</Text>
                        </View>
                    ) : (
                        conversations.map(conv => (
                            <TouchableOpacity key={conv.id} style={styles.conversationCard} onPress={() => setActiveChat(conv)}>
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {(conv.profiles?.full_name || 'U')[0].toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.candidateName}>{conv.profiles?.full_name}</Text>
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

            <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15 }]}>
                <TouchableOpacity onPress={() => setActiveChat(null)} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.chatHeaderCompany}>{activeChat.profiles?.full_name}</Text>
                    <Text style={styles.chatHeaderJob}>{activeChat.jobs?.title}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.chatContent}>
                {messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptySubText}>Send a message to kick off the interview process with {activeChat.profiles?.full_name}!</Text>
                    </View>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.sender_id === user?.id; // If HR sent it, they are 'sender'
                        const isRead = msg.content.endsWith('[READ]');
                        const rawContent = msg.content.replace('[READ]', '');
                        const isAttachment = rawContent.startsWith('[ATTACHMENT]');

                        let displayContent = rawContent;
                        let attachmentUrl = '';
                        if (isAttachment) {
                            attachmentUrl = rawContent.replace('[ATTACHMENT]', '');
                            displayContent = attachmentUrl.includes('.pdf') ? '📄 PDF Document' : '🖼️ Image Attachment';
                        }

                        return (
                            <View key={msg.id} style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageThem]}>
                                {isAttachment ? (
                                    <TouchableOpacity onPress={() => Linking.openURL(attachmentUrl)}>
                                        {attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                                            <Image source={{ uri: attachmentUrl }} style={{ width: 200, height: 150, borderRadius: 8, marginBottom: 4 }} />
                                        ) : (
                                            <Text style={[styles.messageText, isMe ? { color: '#fff', textDecorationLine: 'underline' } : { color: theme.primary, textDecorationLine: 'underline' }]}>{displayContent}</Text>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={[styles.messageText, isMe ? { color: '#fff' } : { color: theme.text }]}>{displayContent}</Text>
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 }}>
                                    <Text style={[styles.timeText, { marginTop: 0 }, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textSecondary }]}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {isMe && (
                                        <Ionicons
                                            name="checkmark-done"
                                            size={14}
                                            color={isRead ? theme.primary : "rgba(255,255,255,0.5)"}
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.inputArea}>
                <TouchableOpacity style={styles.attachBtn} onPress={handleAttach} disabled={isUploading}>
                    {isUploading ? <ActivityIndicator size="small" color={theme.textSecondary} /> : <Ionicons name="document-attach" size={24} color={theme.textSecondary} />}
                </TouchableOpacity>
                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message to the candidate..."
                    placeholderTextColor={theme.textSecondary}
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

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.card,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },

    listContent: { padding: 20 },
    conversationCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.card,
        padding: 16, borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1, borderColor: theme.border
    },
    avatarPlaceholder: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        alignItems: 'center', justifyContent: 'center'
    },
    avatarText: { color: theme.primary, fontSize: 20, fontWeight: 'bold' },
    candidateName: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    jobTitle: { color: theme.textSecondary, fontSize: 13 },
    statusBadge: { backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: theme.primary, fontSize: 11, fontWeight: 'bold' },

    emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.6 },
    emptyText: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: theme.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

    // Chat Interface Styles
    chatHeaderCompany: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    chatHeaderJob: { color: theme.textSecondary, fontSize: 13 },

    chatContent: { padding: 20, paddingBottom: 40 },
    messageBubble: {
        maxWidth: '80%', // Standard chat bubble width
        padding: 12, borderRadius: 16,
        marginBottom: 16,
    },
    messageMe: {
        alignSelf: 'flex-end',
        backgroundColor: theme.primary,
        borderBottomRightRadius: 4,
    },
    messageThem: {
        alignSelf: 'flex-start',
        backgroundColor: theme.card,
        borderWidth: 1, borderColor: theme.border,
        borderBottomLeftRadius: 4,
    },
    messageText: { fontSize: 15, lineHeight: 22 },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },

    inputArea: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        backgroundColor: theme.card,
        borderTopWidth: 1, borderTopColor: theme.border,
    },
    attachBtn: { padding: 8, marginRight: 8 },
    textInput: {
        flex: 1,
        backgroundColor: theme.background,
        color: theme.text,
        borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10,
        maxHeight: 100,
        borderWidth: 1, borderColor: theme.border
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.primary,
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 12
    }
});
