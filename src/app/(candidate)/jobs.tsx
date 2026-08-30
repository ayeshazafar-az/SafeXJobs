import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const TYPE_FILTERS = ['All', 'Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote'];
const EDUCATION_OPTIONS = ['Any', 'Matric', 'Intermediate', "Bachelor's", "Master's", 'PhD'];
const WORK_MODE_OPTIONS = ['All', 'Remote', 'Onsite', 'Hybrid'];

export default function FindJobsScreen() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState('All');
    const [showFilters, setShowFilters] = useState(false);
    // Advanced filters
    const [filterProvince, setFilterProvince] = useState('');
    const [filterCity, setFilterCity] = useState('');
    const [filterSalaryMin, setFilterSalaryMin] = useState('');
    const [filterSalaryMax, setFilterSalaryMax] = useState('');
    const [filterExperience, setFilterExperience] = useState('');
    const [filterEducation, setFilterEducation] = useState('Any');
    const [filterWorkMode, setFilterWorkMode] = useState('All');
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applyingTo, setApplyingTo] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Application Confirm State
    const [confirmingJob, setConfirmingJob] = useState<any>(null);
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

    const handleApply = async (jobId: string, jobTitle: string, companyName: string, companyId: string) => {
        if (!user) return;
        setApplyingTo(jobId);

        // 1. Mandatory Video Requirement Check
        const { data: profile } = await supabase.from('profiles').select('video_intro_url').eq('id', user.id).single();
        if (!profile?.video_intro_url) {
            const msg = 'A video introduction is mandatory to apply for jobs. Please complete your profile first.';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Incomplete Profile', msg);
            setApplyingTo(null);
            return;
        }

        // 2. Already Applied Check
        const { data: existingApp } = await supabase
            .from('applications').select('id').eq('job_id', jobId).eq('candidate_id', user.id).single();

        if (existingApp) {
            if (Platform.OS === 'web') alert('You have already applied for this job.');
            else Alert.alert('Already Applied', 'You have already submitted an application for this job.');
            setApplyingTo(null);
            return;
        }

        // 3. Open Confirmation Modal
        setConfirmingJob({ jobId, jobTitle, companyName, companyId });
        setApplyingTo(null);
    };

    const executeApply = async () => {
        if (!user || !confirmingJob) return;
        setApplyingTo(confirmingJob.jobId);

        const { error, data } = await supabase.from('applications').insert({
            job_id: confirmingJob.jobId,
            candidate_id: user.id,
            status: 'Applied',
        }).select('id').single();

        if (error) {
            setApplyingTo(null);
            setConfirmingJob(null);
            if (Platform.OS === 'web') alert('Application failed: ' + error.message);
            else Alert.alert('Application Failed', error.message);
            return;
        }

        // PRD Notifications Trigger: 1 for Candidate, 1 for Company
        await supabase.from('notifications').insert([
            { user_id: user.id, title: '✅ Application Submitted', body: `Your application for ${confirmingJob.jobTitle} at ${confirmingJob.companyName} has been submitted successfully!`, type: 'system' },
            { user_id: confirmingJob.companyId, title: '📄 New Application Received', body: `A candidate has sent their profile for the ${confirmingJob.jobTitle} position.`, type: 'application' }
        ]);

        setApplyingTo(null);
        setConfirmingJob(null);

        if (Platform.OS === 'web') alert(`Application submitted to ${confirmingJob.companyName} for ${confirmingJob.jobTitle}!`);
        else Alert.alert('Application Submitted', `Your profile has been sent to ${confirmingJob.companyName} for the ${confirmingJob.jobTitle} position!`);
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
        const typeMatch = activeType === 'All' || job.job_type === activeType;
        const locationMatch = !filterProvince || (job.location || '').toLowerCase().includes(filterProvince.toLowerCase());
        const cityMatch = !filterCity || (job.location || '').toLowerCase().includes(filterCity.toLowerCase());
        const salaryMatch = !filterSalaryMin || (job.salary_min && job.salary_min >= parseInt(filterSalaryMin));
        const salaryMaxMatch = !filterSalaryMax || (job.salary_max && job.salary_max <= parseInt(filterSalaryMax));
        const expMatch = !filterExperience || (job.required_experience || '').toLowerCase().includes(filterExperience.toLowerCase());
        const eduMatch = filterEducation === 'Any' || (job.required_education || '').toLowerCase().includes(filterEducation.toLowerCase());
        const workModeMatch = filterWorkMode === 'All' || (job.job_type || '').toLowerCase().includes(filterWorkMode.toLowerCase()) || (job.location || '').toLowerCase().includes(filterWorkMode.toLowerCase());
        return queryMatch && typeMatch && locationMatch && cityMatch && salaryMatch && salaryMaxMatch && expMatch && eduMatch && workModeMatch;
    });

    const handleCreateAlert = async () => {
        if (!user) return;
        if (!filterProvince && !filterCity && !filterExperience && filterEducation === 'Any' && filterWorkMode === 'All' && !filterSalaryMin) {
            Alert.alert('Too Broad', 'Please apply some specific filters (like City or Experience) to create a meaningful job alert.');
            return;
        }

        try {
            const alertData = {
                id: Date.now().toString(),
                province: filterProvince,
                city: filterCity,
                salaryMin: filterSalaryMin,
                experience: filterExperience,
                education: filterEducation,
                workMode: filterWorkMode,
                createdAt: new Date().toISOString()
            };

            const key = `job_alerts_${user.id}`;
            const existingAlertsStr = await AsyncStorage.getItem(key);
            const existingAlerts = existingAlertsStr ? JSON.parse(existingAlertsStr) : [];

            existingAlerts.push(alertData);
            await AsyncStorage.setItem(key, JSON.stringify(existingAlerts));

            Alert.alert('Job Alert Created!', 'You will be notified when new jobs match these exact filters.');
        } catch (error) {
            console.error('Error saving job alert:', error);
            Alert.alert('Error', 'Failed to create job alert.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Find Jobs</Text>
                <Text style={styles.subtitle}>Explore opportunities matching your skills</Text>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search role, company, skill, category"
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                        <Ionicons name={showFilters ? "close" : "options"} size={22} color={showFilters ? theme.danger : theme.text} />
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
                            <TextInput style={[styles.advInput, { marginRight: 8 }]} placeholder="Province" placeholderTextColor={theme.textSecondary} value={filterProvince} onChangeText={setFilterProvince} />
                            <TextInput style={styles.advInput} placeholder="City" placeholderTextColor={theme.textSecondary} value={filterCity} onChangeText={setFilterCity} />
                        </View>
                        <View style={styles.advRow}>
                            <TextInput style={[styles.advInput, { marginRight: 8 }]} placeholder="Min Salary" placeholderTextColor={theme.textSecondary} keyboardType="numeric" value={filterSalaryMin} onChangeText={setFilterSalaryMin} />
                            <TextInput style={styles.advInput} placeholder="Max Salary" placeholderTextColor={theme.textSecondary} keyboardType="numeric" value={filterSalaryMax} onChangeText={setFilterSalaryMax} />
                        </View>
                        <View style={styles.advRow}>
                            <TextInput style={styles.advInput} placeholder="Experience (e.g. 2 years)" placeholderTextColor={theme.textSecondary} value={filterExperience} onChangeText={setFilterExperience} />
                        </View>

                        {/* Education Level */}
                        <Text style={styles.advLabel}>Education Level</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                            {EDUCATION_OPTIONS.map(opt => (
                                <TouchableOpacity key={opt} style={[styles.filterChip, filterEducation === opt && styles.filterChipActive]} onPress={() => setFilterEducation(opt)}>
                                    <Text style={[styles.filterText, filterEducation === opt && styles.filterTextActive]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Work Mode */}
                        <Text style={styles.advLabel}>Work Mode</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                            {WORK_MODE_OPTIONS.map(opt => (
                                <TouchableOpacity key={opt} style={[styles.filterChip, filterWorkMode === opt && styles.filterChipActive]} onPress={() => setFilterWorkMode(opt)}>
                                    <Text style={[styles.filterText, filterWorkMode === opt && styles.filterTextActive]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.filterActionsRow}>
                            <TouchableOpacity
                                style={styles.clearBtn}
                                onPress={() => { setFilterProvince(''); setFilterCity(''); setFilterSalaryMin(''); setFilterSalaryMax(''); setFilterExperience(''); setFilterEducation('Any'); setFilterWorkMode('All'); }}
                            >
                                <Text style={styles.clearBtnText}>Clear All Filters</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.createAlertBtn}
                                onPress={handleCreateAlert}
                            >
                                <Ionicons name="notifications" size={16} color="#fff" />
                                <Text style={styles.createAlertBtnText}>Create Job Alert</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.jobsList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : filteredJobs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Ionicons name="search-outline" size={64} color={theme.border} />
                        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>No jobs found matching your filters.</Text>
                    </View>
                ) : (
                    filteredJobs.map((job) => {
                        const isExpanded = expandedId === job.id;
                        return (
                            <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => setExpandedId(isExpanded ? null : job.id)} activeOpacity={0.85}>
                                <View style={styles.jobMainInfo}>
                                    <View style={styles.jobIcon}>
                                        <Ionicons name="briefcase" size={24} color={theme.primary} />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                                        <Text style={styles.jobCompany}>{job.profiles?.company_name || job.profiles?.full_name || 'Company'}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.applyBtn}
                                        onPress={() => handleApply(job.id, job.title, job.profiles?.company_name || 'the company', job.company_id)}
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
                                    {job.job_type && <View style={styles.tag}><Text style={styles.tagText}>{job.job_type}</Text></View>}
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
                                                <Ionicons name="time-outline" size={14} color={theme.warning} />
                                                <Text style={styles.deadlineText}>Deadline: {new Date(job.application_deadline).toLocaleDateString()}</Text>
                                            </View>
                                        )}

                                        <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                                onPress={() => { setReportedJob(job); setReportModalVisible(true); }}
                                            >
                                                <Ionicons name="warning-outline" size={14} color={theme.danger} />
                                                <Text style={{ color: theme.danger, fontSize: 12, marginLeft: 4 }}>Report Job</Text>
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
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>
                            If you believe this job posting is fraudulent, offensive, or violates SafeX terms, please report it below.
                        </Text>

                        <TextInput
                            style={[styles.advInput, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Describe the issue with this job or company..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            value={complaintDesc}
                            onChangeText={setComplaintDesc}
                        />

                        <TouchableOpacity
                            style={[styles.applyBtn, { backgroundColor: theme.danger, marginTop: 16, alignItems: 'center' }]}
                            onPress={handleReportSubmit}
                            disabled={complaintSaving}
                        >
                            {complaintSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Submit Report</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Application Confirmation Modal */}
            <Modal visible={!!confirmingJob} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', padding: 24 }]}>
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${theme.primary}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Ionicons name="document-text" size={32} color={theme.primary} />
                            </View>
                            <Text style={styles.modalTitle}>Confirm Application</Text>
                        </View>
                        <Text style={{ color: theme.text, fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 24 }}>
                            You are about to submit your profile for the <Text style={{ fontWeight: 'bold' }}>{confirmingJob?.jobTitle}</Text> role at <Text style={{ fontWeight: 'bold' }}>{confirmingJob?.companyName}</Text>.
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24, fontStyle: 'italic' }}>
                            Your current Video Introduction and Professional Profile will be securely shared with the Hiring Manager.
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={[styles.applyBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, alignItems: 'center' }]} onPress={() => setConfirmingJob(null)}>
                                <Text style={{ color: theme.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.applyBtn, { flex: 1, alignItems: 'center' }]} onPress={executeApply} disabled={applyingTo === confirmingJob?.jobId}>
                                {applyingTo === confirmingJob?.jobId ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyBtnText}>Send Application</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, backgroundColor: theme.card,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 15, color: theme.textSecondary, marginBottom: 20 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.background, borderRadius: 12,
        paddingHorizontal: 16, height: 50,
        borderWidth: 1, borderColor: theme.border, marginBottom: 16,
    },
    searchInput: { flex: 1, color: theme.text, marginLeft: 10, fontSize: 15 },
    filtersScroll: { flexDirection: 'row' },
    filterChip: {
        paddingVertical: 6, paddingHorizontal: 16,
        backgroundColor: theme.background, borderRadius: 20,
        marginRight: 10, borderWidth: 1, borderColor: theme.border,
    },
    filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    filterText: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
    filterTextActive: { color: '#fff' },

    // Advanced Filters
    advFilters: {
        marginTop: 16, padding: 16, backgroundColor: theme.background,
        borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    },
    advRow: { flexDirection: 'row', marginBottom: 10 },
    advInput: {
        flex: 1, backgroundColor: theme.card, borderRadius: 8,
        padding: 12, color: theme.text, fontSize: 13,
        borderWidth: 1, borderColor: theme.border,
    },
    clearBtn: { alignSelf: 'flex-end', marginTop: 4 },
    clearBtnText: { color: theme.danger, fontSize: 13, fontWeight: '600' },
    filterActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    createAlertBtn: {
        backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center',
        gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12
    },
    createAlertBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    advLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },

    jobsList: { padding: 20, paddingBottom: 100 },
    jobCard: {
        backgroundColor: theme.card, borderRadius: 16,
        padding: 20, marginBottom: 16,
        borderWidth: 1, borderColor: theme.border,
    },
    jobMainInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    jobIcon: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
    },
    jobTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    jobCompany: { fontSize: 14, color: theme.textSecondary },
    jobTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
    tag: {
        backgroundColor: theme.background, paddingVertical: 4, paddingHorizontal: 10,
        borderRadius: 8, borderWidth: 1, borderColor: theme.border,
    },
    tagText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },

    // Expanded
    expandedBox: {
        backgroundColor: theme.background, borderRadius: 10,
        padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: theme.border,
    },
    descText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
    detailBlock: { marginBottom: 10 },
    detailLabel: { color: theme.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    detailContent: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    detailRow: { flexDirection: 'row', gap: 16 },
    deadlineBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 8, marginTop: 8,
    },
    deadlineText: { color: theme.warning, fontSize: 12, fontWeight: '600' },

    jobFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12,
    },
    jobSalary: { color: theme.success, fontWeight: 'bold', fontSize: 14 },
    jobTime: { color: theme.textSecondary, fontSize: 12 },
    applyBtn: { backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' }
});
