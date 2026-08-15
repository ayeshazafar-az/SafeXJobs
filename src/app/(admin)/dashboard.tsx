import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminDashboardScreen() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ companies: 0, candidates: 0, jobs: 0, apps: 0 });
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const loadData = async () => {
        setLoading(true);
        // Load companies
        const { data } = await supabase.from('profiles').select('*').eq('role', 'company');
        if (data) setCompanies(data);

        // Load stats
        const [companiesCount, candidatesCount, jobsCount] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
            supabase.from('jobs').select('*', { count: 'exact', head: true })
        ]);

        setStats({
            companies: companiesCount.count || 0,
            candidates: candidatesCount.count || 0,
            jobs: jobsCount.count || 0,
            apps: 0 // Placeholder until Applications table is generated
        });

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const updateCompanyStatus = async (id: string, status: string) => {
        const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
        if (error) {
            Alert.alert('Error Updating Status', error.message);
        } else {
            loadData();
            if (modalVisible) setModalVisible(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Admin Portal</Text>
                    <Text style={styles.subtitle}>Welcome back, System Administrator</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="business" size={28} color="#3b82f6" />
                        <Text style={styles.statNumber}>{stats.companies}</Text>
                        <Text style={styles.statLabel}>Companies</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={28} color="#10b981" />
                        <Text style={styles.statNumber}>{stats.candidates}</Text>
                        <Text style={styles.statLabel}>Candidates</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="briefcase" size={28} color="#f59e0b" />
                        <Text style={styles.statNumber}>{stats.jobs}</Text>
                        <Text style={styles.statLabel}>Active Jobs</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="document-text" size={28} color="#ec4899" />
                        <Text style={styles.statNumber}>{stats.apps}</Text>
                        <Text style={styles.statLabel}>Total Apps</Text>
                    </View>
                </View>

                {/* Verification Section */}
                <Text style={styles.sectionTitle}>Pending Verification</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#f59e0b" style={{ marginVertical: 30 }} />
                ) : (
                    <>
                        {companies.filter(c => c.status === 'Pending' || c.status === 'Under Review' || !c.status).length === 0 && (
                            <Text style={{ color: '#94a3b8', marginHorizontal: 8, fontStyle: 'italic' }}>No companies pending verification.</Text>
                        )}

                        {companies.filter(c => c.status === 'Pending' || c.status === 'Under Review' || !c.status).map(company => (
                            <View key={company.id} style={[styles.actionCard, { marginBottom: 16 }]}>
                                <View style={styles.actionHeader}>
                                    <Ionicons name="business-outline" size={32} color="#f59e0b" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.actionName}>{company.company_name || 'Unnamed Company'}</Text>
                                        <Text style={styles.actionDesc}>Status: <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{company.status || 'Pending'}</Text></Text>
                                    </View>
                                </View>
                                <View style={styles.actionsBlock}>
                                    <TouchableOpacity
                                        style={[styles.btn, { borderColor: '#ef4444', borderWidth: 1 }]}
                                        onPress={() => updateCompanyStatus(company.id, 'Rejected')}
                                    >
                                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: '#10b981', flex: 1.5 }]}
                                        onPress={() => updateCompanyStatus(company.id, 'Verified')}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Verified Companies</Text>

                        {companies.filter(c => c.status === 'Verified').length === 0 && (
                            <Text style={{ color: '#94a3b8', marginHorizontal: 8, fontStyle: 'italic' }}>No verified companies yet.</Text>
                        )}

                        {companies.filter(c => c.status === 'Verified').map(company => (
                            <View key={company.id} style={[styles.actionCard, { marginBottom: 16 }]}>
                                <View style={styles.actionHeader}>
                                    <Ionicons name="business" size={32} color="#10b981" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.actionName}>{company.company_name || 'Unnamed Company'}</Text>
                                        <Text style={styles.actionDesc}>Status: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Verified</Text></Text>
                                    </View>
                                </View>
                                <View style={styles.actionsBlock}>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                        onPress={() => updateCompanyStatus(company.id, 'Suspended')}
                                    >
                                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Suspend Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        padding: 24,
        paddingTop: 60,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    logoutBtn: {
        padding: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
    },
    content: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 12,
        marginBottom: 4,
    },
    statLabel: {
        color: '#94a3b8',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 24,
        marginBottom: 16,
        marginLeft: 8,
    },
    actionCard: {
        backgroundColor: '#1e293b',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginHorizontal: 8,
    },
    actionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    actionName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    actionDesc: {
        color: '#94a3b8',
        fontSize: 13,
        marginTop: 4,
    },
    actionsBlock: {
        flexDirection: 'row',
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#334155',
        borderRadius: 20,
    },
    modalScroll: {
        padding: 24,
    },
    detailsContainer: {
        gap: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    detailLabel: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 4,
    },
    detailValue: {
        color: '#f8fafc',
        fontSize: 15,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginLeft: 32,
    },
    modalFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        flexDirection: 'row',
        backgroundColor: '#0f172a',
    }
});
