import { adminSupabase } from '@/lib/adminSupabase';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminDashboardScreen() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ companies: 0, candidates: 0, jobs: 0, apps: 0 });
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const loadData = async () => {
        setLoading(true);

        try {
            // Use adminSupabase (service role key) to bypass RLS
            const { data, error } = await adminSupabase.from('profiles').select('*').eq('role', 'company');
            console.log('[ADMIN] Companies fetched:', data?.length, 'Error:', error?.message || 'none');

            if (error) {
                Alert.alert('Supabase Error', error.message);
            } else if (data) {
                // Dump every company's status so we can see exactly what's in the DB
                data.forEach((c, i) => console.log(`[ADMIN] Company #${i + 1}: name=${c.company_name}, status='${c.status}', email=${c.email}, id=${c.id}`));
                if (data.length === 0) {
                    Alert.alert('Empty Fetch', 'No companies found in the database.');
                }
                setCompanies(data);
            } else {
                Alert.alert('Null Data', 'Data payload was entirely undefined.');
            }
        } catch (e: any) {
            Alert.alert('Fatal Exception', e.message || String(e));
        }

        // Load stats
        const [companiesCount, candidatesCount, jobsCount] = await Promise.all([
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
            adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
            adminSupabase.from('jobs').select('*', { count: 'exact', head: true })
        ]);

        setStats({
            companies: companiesCount.count || 0,
            candidates: candidatesCount.count || 0,
            jobs: jobsCount.count || 0,
            apps: 0 // Placeholder until Applications table is generated
        });

        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const updateCompanyStatus = async (id: string, status: string) => {
        const { error } = await adminSupabase.from('profiles').update({ status }).eq('id', id);
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
                    <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/users')}>
                        <Ionicons name="business" size={28} color="#3b82f6" />
                        <Text style={styles.statNumber}>{stats.companies}</Text>
                        <Text style={styles.statLabel}>Companies</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/users')}>
                        <Ionicons name="people" size={28} color="#10b981" />
                        <Text style={styles.statNumber}>{stats.candidates}</Text>
                        <Text style={styles.statLabel}>Candidates</Text>
                    </TouchableOpacity>
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
                            <TouchableOpacity activeOpacity={0.7} onPress={() => { setSelectedCompany(company); setModalVisible(true); }} key={company.id} style={[styles.actionCard, { marginBottom: 16 }]}>
                                <View style={styles.actionHeader}>
                                    <Ionicons name="business-outline" size={32} color="#f59e0b" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={styles.actionName}>{company.company_name || 'Unnamed Company'}</Text>
                                        <Text style={styles.actionDesc}>Status: <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{company.status || 'Pending'}</Text></Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
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
                            </TouchableOpacity>
                        ))}

                        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Verified Companies</Text>

                        {companies.filter(c => c.status === 'Verified').length === 0 && (
                            <Text style={{ color: '#94a3b8', marginHorizontal: 8, fontStyle: 'italic' }}>No verified companies yet.</Text>
                        )}

                        {companies.filter(c => c.status === 'Verified').map(company => (
                            <TouchableOpacity activeOpacity={0.7} onPress={() => { setSelectedCompany(company); setModalVisible(true); }} key={company.id} style={[styles.actionCard, { marginBottom: 16 }]}>
                                <View style={styles.actionHeader}>
                                    <Ionicons name="business" size={32} color="#10b981" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={styles.actionName}>{company.company_name || 'Unnamed Company'}</Text>
                                        <Text style={styles.actionDesc}>Status: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>Verified</Text></Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                                </View>
                                <View style={styles.actionsBlock}>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                        onPress={() => updateCompanyStatus(company.id, 'Suspended')}
                                    >
                                        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Suspend Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Rejected / Other Status Companies */}
                        {companies.filter(c => c.status && c.status !== 'Pending' && c.status !== 'Under Review' && c.status !== 'Verified').length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Rejected / Other</Text>
                                {companies.filter(c => c.status && c.status !== 'Pending' && c.status !== 'Under Review' && c.status !== 'Verified').map(company => (
                                    <TouchableOpacity activeOpacity={0.7} onPress={() => { setSelectedCompany(company); setModalVisible(true); }} key={company.id} style={[styles.actionCard, { marginBottom: 16 }]}>
                                        <View style={styles.actionHeader}>
                                            <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={styles.actionName}>{company.company_name || 'Unnamed Company'}</Text>
                                                <Text style={styles.actionDesc}>Status: <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{company.status}</Text></Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#64748b" />
                                        </View>
                                        <View style={styles.actionsBlock}>
                                            <TouchableOpacity
                                                style={[styles.btn, { borderColor: '#f59e0b', borderWidth: 1 }]}
                                                onPress={() => updateCompanyStatus(company.id, 'Pending')}
                                            >
                                                <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>Move to Pending</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.btn, { backgroundColor: '#10b981', flex: 1.5 }]}
                                                onPress={() => updateCompanyStatus(company.id, 'Verified')}
                                            >
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Approve</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Company Profile Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#f8fafc" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalScroll}>
                            {selectedCompany && (
                                <View style={styles.detailsContainer}>
                                    {selectedCompany.logo_url && (
                                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                            <Image source={{ uri: selectedCompany.logo_url }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#334155' }} />
                                        </View>
                                    )}

                                    <View style={styles.detailRow}>
                                        <Ionicons name="business-outline" size={20} color="#3b82f6" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>Company Name</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.company_name}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <Ionicons name="pricetag-outline" size={20} color="#10b981" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>Industry</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.industry || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <Ionicons name="location-outline" size={20} color="#f59e0b" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>Location</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.company_location || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <Ionicons name="globe-outline" size={20} color="#8b5cf6" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>Website</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.website_url || selectedCompany.website || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <Ionicons name="document-text-outline" size={20} color="#ec4899" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>Registration Number / Info</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.registration_info || 'N/A'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <Ionicons name="information-circle-outline" size={20} color="#06b6d4" />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.detailLabel}>About the Company</Text>
                                            <Text style={styles.detailValue}>{selectedCompany.company_description || 'N/A'}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {selectedCompany && (!selectedCompany.status || selectedCompany.status === 'Pending' || selectedCompany.status === 'Under Review') && (
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.btn, { borderColor: '#ef4444', borderWidth: 1, marginRight: 12 }]}
                                    onPress={() => updateCompanyStatus(selectedCompany.id, 'Rejected')}
                                >
                                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Reject</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: '#10b981', flex: 1.5 }]}
                                    onPress={() => updateCompanyStatus(selectedCompany.id, 'Verified')}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Approve</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {selectedCompany && selectedCompany.status === 'Verified' && (
                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.btn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                    onPress={() => updateCompanyStatus(selectedCompany.id, 'Suspended')}
                                >
                                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Suspend Account</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
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
