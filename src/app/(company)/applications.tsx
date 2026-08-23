import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ALL_STATUSES = [
    'Applied', 'Under Review', 'Shortlisted', 'Test Assigned', 'Test Submitted',
    'Test Passed', 'Interview Scheduled', 'Interview Completed', 'Selected',
    'Offer Sent', 'Hired', 'Offer Declined', 'Rejected', 'Withdrawn'
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Applied': return '#94a3b8';
        case 'Under Review': return '#60a5fa';
        case 'Shortlisted': return '#a78bfa';
        case 'Test Assigned': return '#f59e0b';
        case 'Test Submitted': return '#fbbf24';
        case 'Test Passed': return '#34d399';
        case 'Interview Scheduled': return '#fb923c';
        case 'Interview Completed': return '#38bdf8';
        case 'Selected': return '#10b981';
        case 'Offer Sent': return '#06b6d4';
        case 'Hired': return '#22c55e';
        case 'Offer Declined': return '#f97316';
        case 'Rejected': return '#f43f5e';
        case 'Withdrawn': return '#64748b';
        default: return '#94a3b8';
    }
};

const getNextActions = (status: string) => {
    switch (status) {
        case 'Applied': return ['Under Review', 'Shortlisted', 'Rejected'];
        case 'Under Review': return ['Shortlisted', 'Rejected'];
        case 'Shortlisted': return ['Test Assigned', 'Interview Scheduled', 'Rejected'];
        case 'Test Assigned': return ['Rejected'];
        case 'Test Submitted': return ['Test Passed', 'Rejected'];
        case 'Test Passed': return ['Interview Scheduled', 'Rejected'];
        case 'Interview Scheduled': return ['Interview Completed', 'Rejected'];
        case 'Interview Completed': return ['Selected', 'Rejected'];
        case 'Selected': return ['Offer Sent', 'Rejected'];
        case 'Offer Sent': return []; // Waiting for candidate to accept/decline
        case 'Hired': return [];
        case 'Offer Declined': return [];
        case 'Rejected': return [];
        case 'Withdrawn': return [];
        default: return ['Under Review'];
    }
};

export default function CompanyApplicationsScreen() {
    const { user, role } = useAuth();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Offer Modal State
    const [offerModalVisible, setOfferModalVisible] = useState(false);
    const [selectedOfferApp, setSelectedOfferApp] = useState<any>(null);
    const [offerSalary, setOfferSalary] = useState('');
    const [offerStartDate, setOfferStartDate] = useState('');
    const [offerTerms, setOfferTerms] = useState('');

    // Complaint State
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [reportedCandidate, setReportedCandidate] = useState<any>(null);
    const [complaintDesc, setComplaintDesc] = useState('');
    const [complaintSaving, setComplaintSaving] = useState(false);

    const fetchApplications = async () => {
        if (!user) return;
        setLoading(true);
        const roleColumn = role === 'hiring_manager' ? 'hiring_manager_id' : 'company_id';

        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                jobs!inner ( title, company_id, hiring_manager_id, profiles!jobs_company_id_fkey (company_name) ),
                profiles!applications_candidate_id_fkey (
                    full_name, company_location, skills, education, experience,
                    linkedin_url, portfolio_url, resume_url, video_intro_url,
                    career_objective, province, city
                )
            `)
            .eq(`jobs.${roleColumn}`, user.id)
            .order('created_at', { ascending: false });

        if (data) setApplications(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { fetchApplications(); }, [user]);

    const onRefresh = () => { setRefreshing(true); fetchApplications(); };

    const updateStatus = async (appId: string, newStatus: string, candidateId?: string, isOffer: boolean = false) => {
        if (newStatus === 'Offer Sent') {
            const app = applications.find(a => a.id === appId);
            setSelectedOfferApp(app);
            setOfferModalVisible(true);
            return;
        }

        setUpdatingId(appId);
        const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
        setUpdatingId(null);

        if (error) {
            if (Platform.OS === 'web') alert('Update failed: ' + error.message);
            else Alert.alert('Update Failed', error.message);
            return;
        }

        setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: newStatus } : app));

        if (candidateId) {
            const messages: Record<string, string> = {
                'Shortlisted': 'Your application has been shortlisted. The hiring team will contact you regarding the next step.',
                'Test Assigned': 'You have received a new test/assignment. Please check your Tests section.',
                'Interview Scheduled': 'You have been invited for an interview! Check your Interviews section for details.',
                'Selected': 'Congratulations! You have been selected for the position! The company will send an offer letter soon.',
                'Rejected': 'Thank you for your interest. After careful consideration, we have decided to move forward with other candidates.',
            };
            if (messages[newStatus]) {
                await supabase.from('notifications').insert({
                    user_id: candidateId,
                    title: `Application ${newStatus}`,
                    body: messages[newStatus],
                    type: 'application_update',
                });
            }
        }
    };

    const handleSendOffer = async () => {
        if (!selectedOfferApp || !offerSalary || !offerStartDate) {
            if (Platform.OS === 'web') alert('Please fill in salary and start date.');
            else Alert.alert('Required', 'Please fill in salary and start date.');
            return;
        }
        setUpdatingId(selectedOfferApp.id);

        // Save offer details to the applications table AND set status to 'Offer Sent'
        const updatePayload: Record<string, any> = { status: 'Offer Sent' };
        if (offerSalary) updatePayload.offer_salary = offerSalary;
        if (offerStartDate) updatePayload.offer_start_date = offerStartDate;
        if (offerTerms) updatePayload.offer_terms = offerTerms;

        const { error } = await supabase.from('applications').update(updatePayload).eq('id', selectedOfferApp.id);

        if (!error) {
            const companyName = selectedOfferApp.jobs?.profiles?.company_name || 'the company';
            const offerMessage = `You have received an official job offer from ${companyName} for the ${selectedOfferApp.jobs?.title} position!\n\n` +
                `Proposed Salary: ${offerSalary} PKR\n` +
                `Start Date: ${offerStartDate}\n` +
                `Terms: ${offerTerms || 'Standard company policies apply.'}\n\n` +
                `Please go to your Applications tab to review and accept or decline this offer.`;

            await supabase.from('notifications').insert({
                user_id: selectedOfferApp.candidate_id,
                title: '🎉 Job Offer Received!',
                body: offerMessage,
                type: 'job_offer'
            });

            setApplications(apps => apps.map(app => app.id === selectedOfferApp.id ? { ...app, status: 'Offer Sent', offer_salary: offerSalary, offer_start_date: offerStartDate, offer_terms: offerTerms } : app));
            setOfferModalVisible(false);
            setOfferSalary(''); setOfferStartDate(''); setOfferTerms('');

            if (Platform.OS === 'web') alert('Offer sent to candidate successfully!');
            else Alert.alert('Offer Sent', 'The candidate has been notified of the job offer.');
        } else {
            if (Platform.OS === 'web') alert('Failed to send offer.');
            else Alert.alert('Error', error.message);
        }
        setUpdatingId(null);
    };

    const handleReportSubmit = async () => {
        if (!reportedCandidate || !complaintDesc.trim()) {
            if (Platform.OS === 'web') alert('Please provide a reason for reporting.');
            else Alert.alert('Required', 'Please provide a reason for reporting.');
            return;
        }

        setComplaintSaving(true);
        const { error } = await supabase.from('complaints').insert({
            reported_by: user?.id,
            reported_user_id: reportedCandidate.candidate_id, // We report the candidate
            application_id: reportedCandidate.id,
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
            setReportedCandidate(null);
            if (Platform.OS === 'web') alert('Candidate reported successfully.');
            else Alert.alert('Report Submitted', 'Your report has been sent to the moderation team.');
        }
    };

    const openUrl = (url: string) => { if (url) Linking.openURL(url); };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Candidate Review</Text>
                <Text style={styles.subtitle}>Evaluate incoming applications for your active listings.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
                ) : applications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={64} color="#334155" />
                        <Text style={styles.emptyText}>No applications received yet.</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const c = app.profiles;
                        const job = app.jobs;
                        const statusColor = getStatusColor(app.status);
                        const isExpanded = expandedId === app.id;
                        const nextActions = getNextActions(app.status);

                        return (
                            <TouchableOpacity key={app.id} style={styles.appCard} onPress={() => setExpandedId(isExpanded ? null : app.id)} activeOpacity={0.85}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{(c?.full_name || 'U')[0].toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.candidateName}>{c?.full_name || 'Anonymous'}</Text>
                                        <Text style={styles.jobTitleApplied}>Applied for: <Text style={{ color: '#f8fafc' }}>{job?.title}</Text></Text>
                                        <Text style={styles.timeText}>{c?.province && c?.city ? `${c.city}, ${c.province}` : ''} • {new Date(app.created_at).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>{app.status}</Text>
                                    </View>
                                </View>

                                {c?.career_objective && (
                                    <View style={styles.bioBox}>
                                        <Text style={styles.bioText} numberOfLines={isExpanded ? undefined : 2}>{c.career_objective}</Text>
                                    </View>
                                )}

                                {c?.skills && c.skills.length > 0 && (
                                    <View style={styles.skillsWrapper}>
                                        {(isExpanded ? c.skills : c.skills.slice(0, 4)).map((s: string, i: number) => (
                                            <View key={i} style={styles.skillTag}><Text style={styles.skillText}>{s}</Text></View>
                                        ))}
                                    </View>
                                )}

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        {c?.education && c.education.length > 0 && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="school-outline" size={16} color="#60a5fa" />
                                                <Text style={styles.detailText}>{c.education.map((e: any) => `${e.degree} - ${e.institution}`).join('\n')}</Text>
                                            </View>
                                        )}
                                        {c?.experience && c.experience.length > 0 && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="briefcase-outline" size={16} color="#f59e0b" />
                                                <Text style={styles.detailText}>{c.experience.map((e: any) => `${e.title} at ${e.company}`).join('\n')}</Text>
                                            </View>
                                        )}

                                        <View style={styles.quickActions}>
                                            {c?.video_intro_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => openUrl(c.video_intro_url)}>
                                                    <Ionicons name="videocam" size={16} color="#a78bfa" />
                                                    <Text style={styles.quickBtnText}>Watch Video</Text>
                                                </TouchableOpacity>
                                            )}
                                            {c?.resume_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => openUrl(c.resume_url)}>
                                                    <Ionicons name="document-attach" size={16} color="#38bdf8" />
                                                    <Text style={styles.quickBtnText}>Download CV</Text>
                                                </TouchableOpacity>
                                            )}
                                            {c?.linkedin_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => openUrl(c.linkedin_url)}>
                                                    <Ionicons name="logo-linkedin" size={16} color="#0a66c2" />
                                                    <Text style={styles.quickBtnText}>LinkedIn</Text>
                                                </TouchableOpacity>
                                            )}
                                            {c?.portfolio_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => openUrl(c.portfolio_url)}>
                                                    <Ionicons name="globe-outline" size={16} color="#10b981" />
                                                    <Text style={styles.quickBtnText}>Portfolio</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Status Actions */}
                                {nextActions.length > 0 && (
                                    <>
                                        <View style={styles.actionsDivider} />
                                        <Text style={styles.actionPrompt}>Update Status:</Text>
                                        <View style={styles.actionsRow}>
                                            {updatingId === app.id ? (
                                                <ActivityIndicator color="#3b82f6" style={{ marginVertical: 10 }} />
                                            ) : (
                                                nextActions.map(action => {
                                                    const isReject = action === 'Rejected';
                                                    const isHire = action === 'Hired';
                                                    const color = getStatusColor(action);
                                                    return (
                                                        <TouchableOpacity key={action} style={[styles.actionBtn, isReject ? styles.rejectBtn : (isHire ? styles.hireBtn : { backgroundColor: `${color}25` })]} onPress={() => updateStatus(app.id, action, app.candidate_id, isHire)}>
                                                            <Text style={[styles.actionBtnText, { color: isReject ? '#f43f5e' : (isHire ? '#fff' : color) }]}>
                                                                {isHire ? 'Extend Offer & Hire' : action}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })
                                            )}
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Job Offer Modal */}
            <Modal visible={offerModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Extend Job Offer</Text>
                            <TouchableOpacity onPress={() => setOfferModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <Text style={{ color: '#94a3b8', marginBottom: 20 }}>
                            You are extending an official offer to <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedOfferApp?.profiles?.full_name}</Text> for the role of <Text style={{ color: '#fff', fontWeight: 'bold' }}>{selectedOfferApp?.jobs?.title}</Text>.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Proposed Salary (PKR)</Text>
                            <TextInput style={styles.input} value={offerSalary} onChangeText={setOfferSalary} placeholder="e.g. 150000" keyboardType="numeric" placeholderTextColor="#64748b" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expected Start Date</Text>
                            <TextInput style={styles.input} value={offerStartDate} onChangeText={setOfferStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Offer Terms & Conditions</Text>
                            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={offerTerms} onChangeText={setOfferTerms} placeholder="List any specific terms, notice periods, or office hours expected..." multiline placeholderTextColor="#64748b" />
                        </View>

                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#22c55e' }]} onPress={handleSendOffer} disabled={updatingId === selectedOfferApp?.id}>
                            {updatingId === selectedOfferApp?.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Official Offer</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Report Candidate Modal */}
            <Modal visible={reportModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Report Candidate</Text>
                            <TouchableOpacity onPress={() => setReportModalVisible(false)}><Ionicons name="close" size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        <Text style={{ color: '#94a3b8', marginBottom: 20 }}>
                            If this candidate is submitting fake information, spam, or abusive content, let us know.
                        </Text>

                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Detail the issue with this candidate..."
                            placeholderTextColor="#64748b"
                            multiline
                            value={complaintDesc}
                            onChangeText={setComplaintDesc}
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: '#f43f5e' }]}
                            onPress={handleReportSubmit}
                            disabled={complaintSaving}
                        >
                            {complaintSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
    title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#94a3b8' },
    listContent: { padding: 20, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginTop: 16 },

    appCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#38bdf8', fontSize: 20, fontWeight: 'bold' },
    candidateName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    jobTitleApplied: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 2 },
    timeText: { color: '#475569', fontSize: 11 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, position: 'absolute', right: 0, top: 0 },
    statusText: { fontSize: 11, fontWeight: 'bold' },

    bioBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#334155', marginBottom: 12 },
    bioText: { color: '#cbd5e1', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
    skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    skillTag: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    skillText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },

    expandedSection: { gap: 12, marginBottom: 12 },
    detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    detailText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, flex: 1 },

    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
    quickBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },

    actionsDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
    actionPrompt: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 10 },
    actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontSize: 12, fontWeight: 'bold' },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#f43f5e' },
    hireBtn: { backgroundColor: '#22c55e' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#334155' },
    submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
