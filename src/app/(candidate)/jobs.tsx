import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TYPE_FILTERS = ['All', 'Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];

export default function FindJobsScreen() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    // Advanced filters
    const [filterProvince, setFilterProvince] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterSalaryMin, setFilterSalaryMin] = useState('');
    const [filterExperience, setFilterExperience] = useState('');
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Complaint State
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportedJob, setReportedJob] = useState<any>(null);
    const [complaintDesc, setComplaintDesc] = useState('');
    const [complaintSaving, setComplaintSaving] = useState(false);

    const fetchJobs = async () => {
        const { data, error } = await supabase
            .from('jobs')
            .select(`*, profiles!jobs_company_id_fkey ( company_name, full_name )`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (data) setJobs(data);
        else console.error("Error fetching jobs", error);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { fetchJobs(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchJobs(); };

    const handleApply = async (jobId: string, jobTitle: string, companyName: string) => {
        if (!user) return;
        setApplyingTo(jobId);

        const { data: existingApp } = await supabase
            .from('applications').select('id').eq('job_id', jobId).eq('candidate_id', user.id).single();

        if (existingApp) {
            if (Platform.OS === 'web') alert('You have already applied for this job.');
            else Alert.alert('Already Applied', 'You have already submitted an application for this job.');
            setApplyingTo(null);
            return;
        }

        const { error } = await supabase.from('applications').insert({
            job_id: jobId, candidate_id: user.id, status: 'Applied',
        });
        setApplyingTo(null);

        if (error) {
            if (Platform.OS === 'web') alert('Application failed: ' + error.message);
            else Alert.alert('Application Failed', error.message);
        } else {
            if (Platform.OS === 'web') alert(`Application submitted to ${companyName} for ${jobTitle}!`);
            else Alert.alert('Application Submitted', `Your profile has been sent to ${companyName} for the ${jobTitle} position!`);
        }
    };

    const handleReportSubmit = async () => {
        if (!reportedJob || !complaintDesc.trim()) {
            if (Platform.OS === 'web') alert('Please provide a description for the report.');
            else Alert.alert('Required', 'Please provide a description for the report.');
            return;
        }

        setComplaintSaving(true);
        const { error } = await supabase.from('complaints').insert({
            reported_by: user?.id,
            reported_user_id: reportedJob.company_id, // We report the company/HM
            job_id: reportedJob.id,
            description: complaintDesc,
            status: 'Pending'
        });

        setComplaintSaving(false);

        if (error) {
            if (Platform.OS === 'web') alert('Failed to submit report.');
            else Alert.alert('Error', error.message);
        } else {
            setReportModalVisible(false);
            setComplaintDesc('');
            setReportedJob(null);
            if (Platform.OS === 'web') alert('Report submitted successfully.');
            else Alert.alert('Report Submitted', 'Your report has been sent to the moderation team.');
        }
    };

    // Filter logic
    const filteredJobs = jobs.filter(job => {
        const q = searchQuery.toLowerCase();
        const queryMatch = !q || job.title.toLowerCase().includes(q) ||
            (job.profiles?.company_name || '').toLowerCase().includes(q) ||
            (job.category || '').toLowerCase().includes(q) ||
            (job.required_skills || '').toLowerCase().includes(q);
        const typeMatch = activeType === 'All' || job.employment_type === activeType || job.job_type === activeType;
        const locationMatch = !filterProvince || (job.location || '').toLowerCase().includes(filterProvince.toLowerCase());
        const cityMatch = !filterCity || (job.location || '').toLowerCase().includes(filterCity.toLowerCase());
        const salaryMatch = !filterSalaryMin || (job.salary_min && job.salary_min >= parseInt(filterSalaryMin));
        const expMatch = !filterExperience || (job.required_experience || '').toLowerCase().includes(filterExperience.toLowerCase());
        return queryMatch && typeMatch && locationMatch && cityMatch && salaryMatch && expMatch;
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Find Jobs</Text>
                <Text style={styles.subtitle}>Explore opportunities matching your skills</Text>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search role, company, skill, category"
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                        <Ionicons name={showFilters ? "close" : "options"} size={22} color={showFilters ? "#f43f5e" : "#f8fafc"} />
                    </TouchableOpacity>
                </View>

                {/* Type Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    {TYPE_FILTERS.map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeType === filter && styles.filterChipActive]}
                            onPress={() => setActiveType(filter)}
                        >
                            <Text style={[styles.filterText, activeType === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <View style={styles.advFilters}>
                        <View style={styles.advRow}>
                            <TextInput style={[styles.advInput, { marginRight: 8 }]} placeholder="Province" placeholderTextColor="#64748b" value={filterProvince} onChangeText={setFilterProvince} />
                            <TextInput style={styles.advInput} placeholder="City" placeholderTextColor="#64748b" value={filterCity} onChangeText={setFilterCity} />
                        </View>
                        <View style={styles.advRow}>
                            <TextInput style={[styles.advInput, { marginRight: 8 }]} placeholder="Min Salary" placeholderTextColor="#64748b" keyboardType="numeric" value={filterSalaryMin} onChangeText={setFilterSalaryMin} />
                            <TextInput style={styles.advInput} placeholder="Experience (e.g. 2 years)" placeholderTextColor="#64748b" value={filterExperience} onChangeText={setFilterExperience} />
                        </View>
                        <TouchableOpacity
                            style={styles.clearBtn}
                            onPress={() => { setFilterProvince(''); setFilterCity(''); setFilterSalaryMin(''); setFilterExperience(''); }}
                        >
                            <Text style={styles.clearBtnText}>Clear Filters</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.jobsList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
                ) : filteredJobs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Ionicons name="search-outline" size={64} color="#334155" />
                        <Text style={{ color: '#94a3b8', marginTop: 16 }}>No jobs found matching your filters.</Text>
                    </View>
                ) : (
                    filteredJobs.map((job) => {
                        const isExpanded = expandedId === job.id;
                        return (
                            <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => setExpandedId(isExpanded ? null : job.id)} activeOpacity={0.85}>
                                <View style={styles.jobMainInfo}>
                                    <View style={styles.jobIcon}>
                                        <Ionicons name="briefcase" size={24} color="#3b82f6" />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                                        <Text style={styles.jobCompany}>{job.profiles?.company_name || job.profiles?.full_name || 'Company'}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.applyBtn}
                                        onPress={() => handleApply(job.id, job.title, job.profiles?.company_name || 'the company')}
                                        disabled={applyingTo === job.id}
                                    >
                                        {applyingTo === job.id ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.applyBtnText}>Apply</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Tags */}
                                <View style={styles.jobTags}>
                                    {job.location && <View style={styles.tag}><Text style={styles.tagText}>{job.location}</Text></View>}
                                    {(job.employment_type || job.job_type) && <View style={styles.tag}><Text style={styles.tagText}>{job.employment_type || job.job_type}</Text></View>}
                                    {job.category && <View style={styles.tag}><Text style={styles.tagText}>{job.category}</Text></View>}
                                    {job.vacancies && job.vacancies > 1 && <View style={styles.tag}><Text style={styles.tagText}>{job.vacancies} positions</Text></View>}
                                </View>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <View style={styles.expandedBox}>
                                        {job.description && (
                                            <Text style={styles.descText}>{job.description}</Text>
                                        )}
                                        {job.responsibilities && (
                                            <View style={styles.detailBlock}>
                                                <Text style={styles.detailLabel}>Responsibilities</Text>
                                                <Text style={styles.detailContent}>{job.responsibilities}</Text>
                                            </View>
                                        )}
                                        {job.benefits && (
                                            <View style={styles.detailBlock}>
                                                <Text style={styles.detailLabel}>Benefits</Text>
                                                <Text style={styles.detailContent}>{job.benefits}</Text>
                                            </View>
                                        )}
                                        {job.required_skills && (
                                            <View style={styles.detailBlock}>
                                                <Text style={styles.detailLabel}>Required Skills</Text>
                                                <Text style={styles.detailContent}>{job.required_skills}</Text>
                                            </View>
                                        )}
                                        <View style={styles.detailRow}>
                                            {job.required_education && (
                                                <View style={styles.detailBlock}>
                                                    <Text style={styles.detailLabel}>Education</Text>
                                                    <Text style={styles.detailContent}>{job.required_education}</Text>
                                                </View>
                                            )}
                                            {job.required_experience && (
                                                <View style={styles.detailBlock}>
                                                    <Text style={styles.detailLabel}>Experience</Text>
                                                    <Text style={styles.detailContent}>{job.required_experience}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {job.application_deadline && (
                                            <View style={styles.deadlineBanner}>
                                                <Ionicons name="time-outline" size={14} color="#f59e0b" />
                                                <Text style={styles.deadlineText}>Deadline: {new Date(job.application_deadline).toLocaleDateString()}</Text>
                                            </View>
                                        )}

                                        <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                                onPress={() => { setReportedJob(job); setReportModalVisible(true); }}
                                            >
                                                <Ionicons name="warning-outline" size={14} color="#f43f5e" />
                                                <Text style={{ color: '#f43f5e', fontSize: 12, marginLeft: 4 }}>Report Job</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Footer */}
                                <View style={styles.jobFooter}>
                                    <Text style={styles.jobSalary}>
                                        {job.salary_min && job.salary_max
                                            ? `PKR ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                                            : 'Salary not disclosed'}
                                    </Text>
                                    <Text style={styles.jobTime}>{new Date(job.created_at).toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Report Job Modal */}
            <Modal visible={reportModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Report Job Posting</Text>
                            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: '#94a3b8', marginBottom: 16 }}>
                            If you believe this job posting is fraudulent, offensive, or violates SafeX terms, please report it below.
                        </Text>

                        <TextInput
                            style={[styles.advInput, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Describe the issue with this job or company..."
                            placeholderTextColor="#64748b"
                            multiline
                            value={complaintDesc}
                            onChangeText={setComplaintDesc}
                        />

                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: '#f43f5e', marginTop: 16, alignItems: 'center' }]}
                            onPress={handleReportSubmit}
                            disabled={complaintSaving}
                        >
                            {complaintSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Submit Report</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, backgroundColor: '#1e293b',
        borderBottomWidth: 1, borderBottomColor: '#334155',
    },
    title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 6 },
    subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 20 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12,
        paddingHorizontal: 16, height: 50,
        borderWidth: 1, borderColor: '#334155', marginBottom: 16,
    },
    searchInput: { flex: 1, color: '#f8fafc', marginLeft: 10, fontSize: 15 },
    filtersScroll: { flexDirection: 'row' },
    filterChip: {
        paddingVertical: 6, paddingHorizontal: 16,
        backgroundColor: '#0f172a', borderRadius: 20,
        marginRight: 10, borderWidth: 1, borderColor: '#334155',
    },
    filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    filterText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
    filterTextActive: { color: '#fff' },

    // Advanced Filters
    advFilters: {
        marginTop: 16, padding: 16, backgroundColor: '#0f172a',
        borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    },
    advRow: { flexDirection: 'row', marginBottom: 10 },
    advInput: {
        flex: 1, backgroundColor: '#1e293b', borderRadius: 8,
        padding: 12, color: '#f8fafc', fontSize: 13,
        borderWidth: 1, borderColor: '#334155',
    },
    clearBtn: { alignSelf: 'flex-end', marginTop: 4 },
    clearBtnText: { color: '#f43f5e', fontSize: 12, fontWeight: '600' },

    jobsList: { padding: 20, paddingBottom: 100 },
    jobCard: {
        backgroundColor: '#1e293b', borderRadius: 16,
        padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: '#334155',
    },
    jobMainInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    jobIcon: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    jobTitle: { fontSize: 17, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    jobCompany: { fontSize: 14, color: '#94a3b8' },
    jobTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    tag: {
        backgroundColor: '#0f172a', paddingVertical: 4, paddingHorizontal: 10,
        borderRadius: 8, borderWidth: 1, borderColor: '#334155',
    },
    tagText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

    // Expanded
    expandedBox: {
        backgroundColor: '#0f172a', borderRadius: 10,
        padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#334155',
    },
    descText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, marginBottom: 12 },
    detailBlock: { marginBottom: 10 },
    detailLabel: { color: '#60a5fa', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    detailContent: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
    detailRow: { flexDirection: 'row', gap: 16 },
    deadlineBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, marginTop: 8,
    },
    deadlineText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },

    jobFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12,
    },
    jobSalary: { color: '#10b981', fontWeight: 'bold', fontSize: 14 },
    jobTime: { color: '#64748b', fontSize: 12 },
    applyBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' }
});
