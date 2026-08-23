import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
    RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];

export default function MyJobsScreen() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Edit modal state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editJob, setEditJob] = useState<any>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDepartment, setEditDepartment] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editSalaryMin, setEditSalaryMin] = useState('');
    const [editSalaryMax, setEditSalaryMax] = useState('');
    const [editJobType, setEditJobType] = useState('Full-Time');
    const [editSaving, setEditSaving] = useState(false);

    const fetchJobs = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('jobs')
            .select('*, applications(count)')
            .eq('company_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setJobs(data);
        else console.error('Error fetching jobs:', error);
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(useCallback(() => { fetchJobs(); }, [user]));

    const onRefresh = () => { setRefreshing(true); fetchJobs(); };

    const toggleJobStatus = async (jobId: string, isCurrentlyActive: boolean) => {
        setTogglingId(jobId);
        const { error } = await supabase.from('jobs').update({ is_active: !isCurrentlyActive }).eq('id', jobId);
        setTogglingId(null);

        if (error) {
            if (Platform.OS === 'web') alert('Failed: ' + error.message);
            else Alert.alert('Error', error.message);
            return;
        }

        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: !isCurrentlyActive } : j));
    };

    const closeJob = async (jobId: string) => {
        const doClose = () => {
            supabase.from('jobs').update({ is_active: false }).eq('id', jobId).then(({ error }) => {
                if (error) {
                    if (Platform.OS === 'web') alert('Failed: ' + error.message);
                    else Alert.alert('Error', error.message);
                } else {
                    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: false } : j));
                }
            });
        };

        if (Platform.OS === 'web') {
            if (confirm('Are you sure you want to close this job? This will hide it from candidates.')) doClose();
        } else {
            Alert.alert('Close Job', 'Are you sure you want to close this job? This will hide it from job seekers.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Close Job', style: 'destructive', onPress: doClose },
            ]);
        }
    };

    const openEditModal = (job: any) => {
        setEditJob(job);
        setEditTitle(job.title || '');
        setEditDepartment(job.department || '');
        setEditLocation(job.location || '');
        setEditDescription(job.description || '');
        setEditSalaryMin(job.salary_min ? String(job.salary_min) : '');
        setEditSalaryMax(job.salary_max ? String(job.salary_max) : '');
        setEditJobType(job.job_type || 'Full-Time');
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editJob || !editTitle || !editDescription) {
            if (Platform.OS === 'web') alert('Title and Description are required.');
            else Alert.alert('Required', 'Title and Description are required.');
            return;
        }

        setEditSaving(true);
        const payload: Record<string, any> = {
            title: editTitle,
            description: editDescription,
            job_type: editJobType,
        };
        if (editDepartment) payload.department = editDepartment;
        if (editLocation) payload.location = editLocation;
        if (editSalaryMin) payload.salary_min = parseInt(editSalaryMin);
        if (editSalaryMax) payload.salary_max = parseInt(editSalaryMax);

        const { error } = await supabase.from('jobs').update(payload).eq('id', editJob.id);
        setEditSaving(false);

        if (error) {
            if (Platform.OS === 'web') alert('Save failed: ' + error.message);
            else Alert.alert('Save Failed', error.message);
            return;
        }

        setJobs(prev => prev.map(j => j.id === editJob.id ? { ...j, ...payload } : j));
        setEditModalVisible(false);

        if (Platform.OS === 'web') alert('Job updated!');
        else Alert.alert('Job Updated', 'Your changes have been saved successfully.');
    };

    const getAppCount = (job: any) => {
        // Supabase returns aggregated counts as [{ count: n }]
        if (job.applications && Array.isArray(job.applications) && job.applications.length > 0) {
            return job.applications[0]?.count || 0;
        }
        return 0;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Jobs</Text>
                <Text style={styles.subtitle}>Manage your job postings</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
                ) : jobs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="briefcase-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>No jobs posted yet</Text>
                        <Text style={styles.emptySubText}>Go to "Post Job" to create your first listing.</Text>
                    </View>
                ) : (
                    jobs.map(job => {
                        const appCount = getAppCount(job);
                        const isActive = job.is_active;
                        return (
                            <View key={job.id} style={[styles.jobCard, !isActive && styles.jobCardInactive]}>
                                {/* Header */}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.jobIcon, { backgroundColor: isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(100, 116, 139, 0.1)' }]}>
                                        <Ionicons name="briefcase" size={22} color={isActive ? '#f59e0b' : '#64748b'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.jobTitle}>{job.title}</Text>
                                        <Text style={styles.jobMeta}>{job.job_type || 'Full-Time'}{job.location ? ` • ${job.location}` : ''}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)' }]}>
                                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : '#64748b' }]} />
                                        <Text style={[styles.statusText, { color: isActive ? '#10b981' : '#64748b' }]}>{isActive ? 'Active' : 'Paused'}</Text>
                                    </View>
                                </View>

                                {/* Stats */}
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="people-outline" size={16} color="#94a3b8" />
                                        <Text style={styles.statText}>{appCount} Applications</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Ionicons name="time-outline" size={16} color="#94a3b8" />
                                        <Text style={styles.statText}>Posted {new Date(job.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    {job.salary_min && job.salary_max && (
                                        <View style={styles.statItem}>
                                            <Ionicons name="cash-outline" size={16} color="#94a3b8" />
                                            <Text style={styles.statText}>PKR {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Actions */}
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(job)}>
                                        <Ionicons name="create-outline" size={18} color="#60a5fa" />
                                        <Text style={[styles.actionText, { color: '#60a5fa' }]}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => toggleJobStatus(job.id, isActive)}
                                        disabled={togglingId === job.id}
                                    >
                                        {togglingId === job.id ? (
                                            <ActivityIndicator color="#f59e0b" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name={isActive ? 'pause' : 'play'} size={18} color="#f59e0b" />
                                                <Text style={[styles.actionText, { color: '#f59e0b' }]}>{isActive ? 'Pause' : 'Resume'}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {isActive && (
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => closeJob(job.id)}>
                                            <Ionicons name="close-circle-outline" size={18} color="#f43f5e" />
                                            <Text style={[styles.actionText, { color: '#f43f5e' }]}>Close</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Edit Job Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Job</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                                <Text style={styles.fieldLabel}>Job Title *</Text>
                                <TextInput style={styles.fieldInput} value={editTitle} onChangeText={setEditTitle} placeholder="Job title" placeholderTextColor="#64748b" />

                                <Text style={styles.fieldLabel}>Department</Text>
                                <TextInput style={styles.fieldInput} value={editDepartment} onChangeText={setEditDepartment} placeholder="Department" placeholderTextColor="#64748b" />

                                <Text style={styles.fieldLabel}>Location</Text>
                                <TextInput style={styles.fieldInput} value={editLocation} onChangeText={setEditLocation} placeholder="Location" placeholderTextColor="#64748b" />

                                <Text style={styles.fieldLabel}>Employment Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                    {JOB_TYPES.map(t => (
                                        <TouchableOpacity key={t} style={[styles.chip, editJobType === t && styles.chipActive]} onPress={() => setEditJobType(t)}>
                                            <Text style={[styles.chipText, editJobType === t && styles.chipTextActive]}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.fieldLabel}>Salary Range (PKR)</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                    <TextInput style={[styles.fieldInput, { flex: 1 }]} value={editSalaryMin} onChangeText={setEditSalaryMin} placeholder="Min" placeholderTextColor="#64748b" keyboardType="numeric" />
                                    <TextInput style={[styles.fieldInput, { flex: 1 }]} value={editSalaryMax} onChangeText={setEditSalaryMax} placeholder="Max" placeholderTextColor="#64748b" keyboardType="numeric" />
                                </View>

                                <Text style={styles.fieldLabel}>Description *</Text>
                                <TextInput style={[styles.fieldInput, { height: 100, textAlignVertical: 'top' }]} value={editDescription} onChangeText={setEditDescription} placeholder="Job description" placeholderTextColor="#64748b" multiline />
                            </ScrollView>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={editSaving}>
                                {editSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.saveBtnText}>Save Changes</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    title: { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },
    listContent: { padding: 20, paddingBottom: 100 },

    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
    emptySubText: { color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center' },

    jobCard: {
        backgroundColor: '#1e293b', borderRadius: 16,
        padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#334155',
    },
    jobCardInactive: { opacity: 0.7 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    jobIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    jobTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 2 },
    jobMeta: { fontSize: 12, color: '#64748b' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '600' },

    statsRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155',
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { color: '#94a3b8', fontSize: 12 },

    actionsRow: {
        flexDirection: 'row', gap: 8,
        paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155',
    },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 10,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    },
    actionText: { fontSize: 13, fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },

    fieldLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
    fieldInput: {
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
        borderRadius: 10, padding: 14, color: '#f8fafc', fontSize: 14,
        marginBottom: 12,
    },

    chip: {
        paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
        backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', marginRight: 8,
    },
    chipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#fff' },

    saveBtn: {
        backgroundColor: '#f59e0b', borderRadius: 12, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 16,
        shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
