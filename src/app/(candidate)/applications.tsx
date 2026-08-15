import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_APPLICATIONS = [
    { id: '1', role: 'Frontend Engineer', company: 'Acme Corp', status: 'Shortlisted', date: '2023-11-20', icon: 'checkmark-circle', color: '#f59e0b' },
    { id: '2', role: 'UI/UX Designer', company: 'Zenith Labs', status: 'Applied', date: '2023-11-22', icon: 'time', color: '#3b82f6' },
    { id: '3', role: 'React Native Dev', company: 'Creative Co.', status: 'Interviewing', date: '2023-11-18', icon: 'videocam', color: '#10b981' },
];

export default function CandidateApplicationsScreen() {
    const [activeTab, setActiveTab] = useState('All');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Applications</Text>
                <Text style={styles.subtitle}>Track your job applications and statuses.</Text>

                {/* Status Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    {['All', 'Applied', 'Shortlisted', 'Interviewing'].map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                            onPress={() => setActiveTab(filter)}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {MOCK_APPLICATIONS.map((app) => (
                    <View key={app.id} style={styles.appCard}>
                        <View style={styles.appHeader}>
                            <View>
                                <Text style={styles.jobRole}>{app.role}</Text>
                                <Text style={styles.companyName}>{app.company}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: `${app.color}15`, borderColor: app.color }]}>
                                <Ionicons name={app.icon as any} size={14} color={app.color} style={{ marginRight: 4 }} />
                                <Text style={[styles.statusText, { color: app.color }]}>{app.status}</Text>
                            </View>
                        </View>

                        <View style={styles.timeline}>
                            <View style={styles.timelinePoint} />
                            <View style={styles.timelineLine} />
                            <View style={[styles.timelinePoint, app.status !== 'Applied' && styles.timelinePointActive]} />
                            <View style={styles.timelineLine} />
                            <View style={[styles.timelinePoint, app.status === 'Interviewing' && styles.timelinePointActive]} />
                        </View>
                        <View style={styles.timelineLabels}>
                            <Text style={styles.timelineLabel}>Applied</Text>
                            <Text style={styles.timelineLabel}>Review</Text>
                            <Text style={styles.timelineLabel}>Interview</Text>
                        </View>

                        <View style={styles.appFooter}>
                            <Text style={styles.dateText}>Applied on {app.date}</Text>
                            <TouchableOpacity>
                                <Text style={styles.actionText}>View Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
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
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15,
        color: '#94a3b8',
        marginBottom: 20,
    },
    filtersScroll: {
        flexDirection: 'row',
    },
    filterChip: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#0f172a',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    filterChipActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    filterText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 13,
    },
    filterTextActive: {
        color: '#fff',
    },
    listContainer: {
        padding: 20,
    },
    appCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    appHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    jobRole: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    companyName: {
        fontSize: 14,
        color: '#94a3b8',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    timeline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    timelinePoint: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6', // applied is always active
    },
    timelinePointActive: {
        backgroundColor: '#3b82f6',
    },
    timelineLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#334155',
        marginHorizontal: 4,
    },
    timelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    timelineLabel: {
        fontSize: 11,
        color: '#64748b',
        width: 60,
        textAlign: 'center',
    },
    appFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 16,
    },
    dateText: {
        color: '#64748b',
        fontSize: 12,
    },
    actionText: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: 13,
    },
});
