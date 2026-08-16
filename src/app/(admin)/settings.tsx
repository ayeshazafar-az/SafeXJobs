import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function AdminSettingsScreen() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [autoVerify, setAutoVerify] = useState(false);
    const [activeTab, setActiveTab] = useState<'Monitoring' | 'Settings'>('Monitoring');
    const [complaints, setComplaints] = useState<any[]>([]);

    useEffect(() => {
        const fetchComplaints = async () => {
            const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
            if (data) setComplaints(data);
        };
        fetchComplaints();
    }, []);

    const handleSignOut = () => {
        if (Platform.OS === 'web') {
            const isConfirmed = window.confirm("Are you sure you want to log out of the Admin Portal?");
            if (isConfirmed) supabase.auth.signOut();
        } else {
            Alert.alert("Sign Out", "Are you sure you want to log out of the Admin Portal?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: async () => await supabase.auth.signOut() }
            ]);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.title}>System Control</Text>
                        <Text style={styles.subtitle}>Platform settings, monitoring, and complaint resolutions.</Text>
                    </View>
                    <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#f43f5e" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabContainer}>
                {['Monitoring', 'Settings'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab as any)}
                    >
                        <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                            {tab === 'Monitoring' ? 'Live Monitoring & Reports' : 'Global Platform Settings'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {activeTab === 'Settings' ? (
                    <View style={styles.settingsWrapper}>
                        <Text style={styles.sectionTitle}>Security & Access</Text>

                        <View style={styles.settingCard}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="construct" size={24} color="#f59e0b" style={styles.settingIcon} />
                                <View>
                                    <Text style={styles.settingTitle}>Maintenance Mode</Text>
                                    <Text style={styles.settingDesc}>Temporarily blocks non-admin logins.</Text>
                                </View>
                            </View>
                            <Switch
                                value={maintenanceMode}
                                onValueChange={setMaintenanceMode}
                                trackColor={{ false: '#334155', true: 'rgba(245, 158, 11, 0.4)' }}
                                thumbColor={maintenanceMode ? '#f59e0b' : '#94a3b8'}
                            />
                        </View>

                        <View style={styles.settingCard}>
                            <View style={styles.settingInfo}>
                                <Ionicons name="checkmark-done-circle" size={24} color="#10b981" style={styles.settingIcon} />
                                <View>
                                    <Text style={styles.settingTitle}>Auto-Verify Companies</Text>
                                    <Text style={styles.settingDesc}>Bypass manual admin verification step.</Text>
                                </View>
                            </View>
                            <Switch
                                value={autoVerify}
                                onValueChange={setAutoVerify}
                                trackColor={{ false: '#334155', true: 'rgba(16, 185, 129, 0.4)' }}
                                thumbColor={autoVerify ? '#10b981' : '#94a3b8'}
                            />
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Category & Location Data</Text>

                        <TouchableOpacity style={styles.managementBtn}>
                            <Ionicons name="pricetags" size={22} color="#3b82f6" />
                            <Text style={styles.managementBtnText}>Manage Job Categories & Skills</Text>
                            <Ionicons name="chevron-forward" size={20} color="#64748b" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.managementBtn}>
                            <Ionicons name="map" size={22} color="#8b5cf6" />
                            <Text style={styles.managementBtnText}>Manage Platform Locations</Text>
                            <Ionicons name="chevron-forward" size={20} color="#64748b" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>

                    </View>
                ) : (
                    <View style={styles.monitoringWrapper}>
                        <View style={styles.systemHealthCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <View style={[styles.pulseDot, { backgroundColor: '#10b981' }]} />
                                <Text style={styles.healthTitle}>System Operational</Text>
                            </View>
                            <Text style={styles.healthDesc}>No major database anomalies detected in the last 24 hours. Verification queues are nominal.</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Active Complaints & Chat Reports</Text>

                        {complaints.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                                <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
                                <Text style={{ color: '#94a3b8', marginTop: 12 }}>Inbox Zero - No active complaints.</Text>
                            </View>
                        ) : (
                            complaints.map((item) => (
                                <View key={item.id} style={styles.complaintCard}>
                                    <View style={styles.complaintHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons
                                                name={item.type === 'Suspicious Activity' ? 'warning' : 'chatbubble-ellipses'}
                                                size={18}
                                                color="#f43f5e"
                                            />
                                            <Text style={styles.complaintType}>{item.type}</Text>
                                        </View>
                                        <View style={styles.severityBadge}>
                                            <Text style={styles.severityText}>{item.severity}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.complaintUser}>Target: {item.user_name || 'Anonymous'}</Text>
                                    <Text style={styles.complaintIssue}>{item.issue}</Text>
                                    <Text style={styles.complaintDate}>{new Date(item.created_at).toLocaleString()}</Text>

                                    <View style={styles.complaintActions}>
                                        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#334155', borderWidth: 1 }]}>
                                            <Text style={{ color: '#94a3b8', fontWeight: 'bold' }}>Dismiss</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6', flex: 1.5 }]}>
                                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Review Evidence</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
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
    signOutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 10,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12, paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(51, 65, 85, 0.4)',
        alignItems: 'center'
    },
    tabBtnActive: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
    tabBtnText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
    tabBtnTextActive: { color: '#f8fafc' },

    content: { padding: 20, paddingBottom: 100 },
    sectionTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700', marginBottom: 16 },

    settingsWrapper: { flex: 1 },
    settingCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#334155'
    },
    settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 },
    settingIcon: { marginRight: 12 },
    settingTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 2 },
    settingDesc: { color: '#94a3b8', fontSize: 12 },

    managementBtn: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1, borderColor: '#334155'
    },
    managementBtnText: { color: '#f8fafc', fontSize: 15, fontWeight: '600', marginLeft: 12 },

    monitoringWrapper: { flex: 1 },
    systemHealthCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    pulseDot: { width: 10, height: 10, borderRadius: 5 },
    healthTitle: { color: '#10b981', fontSize: 16, fontWeight: 'bold' },
    healthDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },

    complaintCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1, borderColor: '#334155',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
            android: { elevation: 3 },
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } as any,
        })
    },
    complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    complaintType: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
    severityBadge: { backgroundColor: 'rgba(244, 63, 94, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    severityText: { color: '#f43f5e', fontSize: 11, fontWeight: 'bold' },
    complaintUser: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
    complaintIssue: { color: '#e2e8f0', fontSize: 15, fontWeight: '500', marginBottom: 12 },
    complaintDate: { color: '#64748b', fontSize: 11, marginBottom: 16 },

    complaintActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16 },
    actionBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }
});
