import { useAuth } from '@/lib/AuthProvider';
import { triggerExternalNotification } from '@/lib/notificationService';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function VideoModal({ url, visible, onClose }: { url: string, visible: boolean, onClose: () => void }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const player = useVideoPlayer(url, player => {
        player.loop = false;
        if (visible) player.play();
    });

    useEffect(() => {
        if (!visible) player.pause();
    }, [visible]);

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.videoOverlay}>
                <View style={styles.videoContent}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <VideoView player={player} style={styles.videoPlayer} />
                </View>
            </View>
        </Modal>
    );
}

const ALL_STATUSES = [
    'Applied', 'Under Review', 'Shortlisted', 'Test Assigned', 'Test Submitted',
    'Test Passed', 'Interview Scheduled', 'Interview Completed', 'Selected',
    'Offer Sent', 'Hired', 'Offer Declined', 'Rejected', 'Withdrawn'
];

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
    const { theme } = useTheme();
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

    // Video Player State
    const [videoUrl, setVideoUrl] = useState('');
    const [videoModalVisible, setVideoModalVisible] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Applied': return theme.textSecondary;
            case 'Under Review': return theme.primary;
            case 'Shortlisted': return theme.primary;
            case 'Test Assigned': return theme.warning;
            case 'Test Submitted': return theme.warning;
            case 'Test Passed': return theme.success;
            case 'Interview Scheduled': return theme.warning;
            case 'Interview Completed': return theme.primary;
            case 'Selected': return theme.success;
            case 'Offer Sent': return theme.primary;
            case 'Hired': return theme.success;
            case 'Offer Declined': return theme.warning;
            case 'Rejected': return theme.danger;
            case 'Withdrawn': return theme.textSecondary;
            default: return theme.textSecondary;
        }
    };

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

            // Feature 4: Fire External Email stub
            triggerExternalNotification(
                selectedOfferApp.candidate_id,
                '🎉 Job Offer Received!',
                offerMessage,
                'email'
            );

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

    const generateOfferPDF = async (app: any) => {
        const c = app.profiles;
        const job = app.jobs;
        const date = new Date().toLocaleDateString();

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid ${theme.primary}; padding-bottom: 20px; margin-bottom: 30px; }
                        h1 { color: ${theme.primary}; margin: 0; }
                        .content { line-height: 1.6; font-size: 16px; }
                        .signature { margin-top: 50px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${job?.profiles?.company_name || 'Our Company'}</h1>
                        <p>Official Job Offer</p>
                    </div>
                    <div class="content">
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>To:</strong> ${c?.full_name}</p>
                        <br/>
                        <p>Dear ${c?.full_name},</p>
                        <p>We are delighted to formally offer you the position of <strong>${job?.title}</strong> at <strong>${job?.profiles?.company_name || 'our company'}</strong>.</p>
                        <p><strong>Proposed Salary:</strong> ${app.offer_salary ? app.offer_salary + ' PKR' : 'As discussed'}</p>
                        <p><strong>Start Date:</strong> ${app.offer_start_date || 'To be determined'}</p>
                        <p><strong>Terms:</strong> ${app.offer_terms || 'Standard employment terms apply.'}</p>
                        <br/>
                        <p>We are excited to have you join our team and look forward to a mutually rewarding relationship. Please review and respond to this offer through the SafeXJobs platform.</p>
                        <br/><br/><br/>
                        <p>Sincerely,</p>
                        <div class="signature">
                            <p>_________________________</p>
                            <p>Hiring Manager</p>
                            <p>${job?.profiles?.company_name || 'Our Company'}</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            if (Platform.OS === 'web') {
                window.open(uri, '_blank');
            } else {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    Alert.alert('Sharing Unavailable', 'Unable to share or save the generated PDF on this device.');
                }
            }
        } catch (error: any) {
            if (Platform.OS === 'web') alert('Error generating PDF: ' + error.message);
            else Alert.alert('Error', 'Could not generate PDF: ' + error.message);
        }
    };

    const openUrl = (url: string) => { if (url) Linking.openURL(url); };

    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Candidate Review</Text>
                <Text style={styles.subtitle}>Evaluate incoming applications for your active listings.</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
                ) : applications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={64} color={theme.border} />
                        <Text style={styles.emptyText}>No applications received yet.</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const c = app.profiles;
                        const job = app.jobs;
                        const statusColor = getStatusColor(app.status);
                        const isExpanded = expandedId === app.id;
                        const nextActions = getNextActions(app.status);

                        const parseArray = (val: any) => {
                            if (Array.isArray(val)) return val;
                            if (typeof val === 'string') {
                                try {
                                    const parsed = JSON.parse(val);
                                    if (Array.isArray(parsed)) return parsed;
                                } catch { }
                            }
                            return [];
                        };

                        const safeSkills = parseArray(c?.skills);
                        const safeEdu = parseArray(c?.education);
                        const safeExp = parseArray(c?.experience);

                        return (
                            <TouchableOpacity key={app.id} style={styles.appCard} onPress={() => setExpandedId(isExpanded ? null : app.id)} activeOpacity={0.85}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>{(c?.full_name || 'U')[0].toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.candidateName}>{c?.full_name || 'Anonymous'}</Text>
                                        <Text style={styles.jobTitleApplied}>Applied for: <Text style={{ color: theme.text }}>{job?.title}</Text></Text>
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

                                {safeSkills.length > 0 && (
                                    <View style={styles.skillsWrapper}>
                                        {(isExpanded ? safeSkills : safeSkills.slice(0, 4)).map((s: string, i: number) => (
                                            <View key={i} style={styles.skillTag}><Text style={styles.skillText}>{s}</Text></View>
                                        ))}
                                    </View>
                                )}

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        {safeEdu.length > 0 && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="school-outline" size={16} color={theme.primary} />
                                                <Text style={styles.detailText}>{safeEdu.join('\n')}</Text>
                                            </View>
                                        )}
                                        {safeExp.length > 0 && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="briefcase-outline" size={16} color={theme.warning} />
                                                <Text style={styles.detailText}>{safeExp.join('\n')}</Text>
                                            </View>
                                        )}

                                        <View style={styles.quickActions}>
                                            {c?.video_intro_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => { setVideoUrl(c.video_intro_url); setVideoModalVisible(true); }}>
                                                    <Ionicons name="videocam" size={16} color={theme.primary} />
                                                    <Text style={styles.quickBtnText}>Watch Video</Text>
                                                </TouchableOpacity>
                                            )}
                                            {c?.resume_url && (
                                                <TouchableOpacity style={styles.quickBtn} onPress={() => openUrl(c.resume_url)}>
                                                    <Ionicons name="document-attach" size={16} color={theme.primary} />
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
                                                    <Ionicons name="globe-outline" size={16} color={theme.success} />
                                                    <Text style={styles.quickBtnText}>Portfolio</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {(app.status === 'Hired' || app.status === 'Offer Sent' || app.status === 'Offer Accepted') && (
                                            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary, marginTop: 16 }]} onPress={() => generateOfferPDF(app)}>
                                                <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Generate Offer Letter (PDF)</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {/* Status Actions */}
                                {nextActions.length > 0 && (
                                    <>
                                        <View style={styles.actionsDivider} />
                                        <Text style={styles.actionPrompt}>Update Status:</Text>
                                        <View style={styles.actionsRow}>
                                            {updatingId === app.id ? (
                                                <ActivityIndicator color={theme.primary} style={{ marginVertical: 10 }} />
                                            ) : (
                                                nextActions.map(action => {
                                                    const isReject = action === 'Rejected';
                                                    const isHire = action === 'Hired';
                                                    const color = getStatusColor(action);
                                                    return (
                                                        <TouchableOpacity key={action} style={[styles.actionBtn, isReject ? styles.rejectBtn : (isHire ? styles.hireBtn : { backgroundColor: `${color}25` })]} onPress={() => updateStatus(app.id, action, app.candidate_id, isHire)}>
                                                            <Text style={[styles.actionBtnText, { color: isReject ? theme.danger : (isHire ? '#fff' : color) }]}>
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
                            <TouchableOpacity onPress={() => setOfferModalVisible(false)}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.textSecondary, marginBottom: 20 }}>
                            You are extending an official offer to <Text style={{ color: theme.text, fontWeight: 'bold' }}>{selectedOfferApp?.profiles?.full_name}</Text> for the role of <Text style={{ color: theme.text, fontWeight: 'bold' }}>{selectedOfferApp?.jobs?.title}</Text>.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Proposed Salary (PKR)</Text>
                            <TextInput style={styles.input} value={offerSalary} onChangeText={setOfferSalary} placeholder="e.g. 150000" keyboardType="numeric" placeholderTextColor={theme.textSecondary} />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expected Start Date</Text>
                            <TextInput style={styles.input} value={offerStartDate} onChangeText={setOfferStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Offer Terms & Conditions</Text>
                            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={offerTerms} onChangeText={setOfferTerms} placeholder="List any specific terms, notice periods, or office hours expected..." multiline placeholderTextColor={theme.textSecondary} />
                        </View>

                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.success }]} onPress={handleSendOffer} disabled={updatingId === selectedOfferApp?.id}>
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
                            <TouchableOpacity onPress={() => setReportModalVisible(false)}><Ionicons name="close" size={24} color={theme.textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={{ color: theme.textSecondary, marginBottom: 20 }}>
                            If this candidate is submitting fake information, spam, or abusive content, let us know.
                        </Text>

                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Detail the issue with this candidate..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            value={complaintDesc}
                            onChangeText={setComplaintDesc}
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: theme.danger }]}
                            onPress={handleReportSubmit}
                            disabled={complaintSaving}
                        >
                            {complaintSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Report</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Video Inline Player Modal */}
            <VideoModal url={videoUrl} visible={videoModalVisible} onClose={() => setVideoModalVisible(false)} />
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { padding: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },
    listContent: { padding: 20, paddingBottom: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginTop: 16 },

    appCard: { backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(56, 189, 248, 0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.primary, fontSize: 20, fontWeight: 'bold' },
    candidateName: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    jobTitleApplied: { color: theme.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    timeText: { color: theme.textSecondary, fontSize: 11 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, position: 'absolute', right: 0, top: 0 },
    statusText: { fontSize: 11, fontWeight: 'bold' },

    bioBox: { backgroundColor: theme.background, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.border, marginBottom: 12 },
    bioText: { color: theme.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
    skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    skillTag: { backgroundColor: theme.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    skillText: { color: theme.text, fontSize: 11, fontWeight: '600' },

    expandedSection: { gap: 12, marginBottom: 12 },
    detailRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    detailText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20, flex: 1 },

    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    quickBtnText: { color: theme.text, fontSize: 12, fontWeight: '600' },

    actionsDivider: { height: 1, backgroundColor: theme.border, marginBottom: 12 },
    actionPrompt: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 10 },
    actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { fontSize: 12, fontWeight: 'bold' },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.danger },
    hireBtn: { backgroundColor: theme.success },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    inputGroup: { marginBottom: 16 },
    label: { color: theme.textSecondary, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: theme.background, color: theme.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border },
    submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    videoContent: { width: '100%', height: 350, position: 'relative' },
    videoPlayer: { width: '100%', height: '100%' },
    closeVideoBtn: { position: 'absolute', top: -40, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }
});
