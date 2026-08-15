import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_CANDIDATES = [
    { id: '1', name: 'John Doe', role: 'Senior React Engineer', score: '98%', status: 'New', location: 'Remote' },
    { id: '2', name: 'Sarah Ahmed', role: 'UI/UX Designer', score: '85%', status: 'Shortlisted', location: 'Islamabad' },
    { id: '3', name: 'Ali Khan', role: 'Backend Developer', score: '72%', status: 'Reviewed', location: 'Lahore' },
];

export default function CompanyApplicationsScreen() {
    const [activeTab, setActiveTab] = useState('All');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Review Candidates</Text>
                <Text style={styles.subtitle}>Manage your incoming applications efficiently.</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    {['All', 'New', 'Shortlisted', 'Interviewing', 'Rejected'].map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeTab === filter && styles.filterChipActive]}
                            onPress={() => setActiveTab(filter)}
                        >
                            <Text style={[styles.filterText, activeTab === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {MOCK_CANDIDATES.map((cand) => (
                    <View key={cand.id} style={styles.candCard}>
                        <View style={styles.candHeader}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={24} color="#f8fafc" />
                            </View>
                            <View style={styles.candInfo}>
                                <Text style={styles.candName}>{cand.name}</Text>
                                <Text style={styles.candRole}>Applied: {cand.role}</Text>
                            </View>
                            <View style={styles.scoreBadge}>
                                <Text style={styles.scoreText}>{cand.score}</Text>
                                <Text style={styles.scoreLabel}>Match</Text>
                            </View>
                        </View>

                        <View style={styles.candMeta}>
                            <View style={styles.metaBadge}>
                                <Ionicons name="location-outline" size={14} color="#94a3b8" />
                                <Text style={styles.metaText}>{cand.location}</Text>
                            </View>
                            <View style={styles.metaBadge}>
                                <Ionicons name="document-text-outline" size={14} color="#94a3b8" />
                                <Text style={styles.metaText}>View CV</Text>
                            </View>
                            <View style={styles.metaBadge}>
                                <Ionicons name="videocam-outline" size={14} color="#3b82f6" />
                                <Text style={[styles.metaText, { color: '#3b82f6' }]}>Play Intro</Text>
                            </View>
                        </View>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtnReject}>
                                <Text style={styles.actionBtnRejectText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnShortlist}>
                                <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.actionBtnShortText}>Shortlist</Text>
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
        lineHeight: 22,
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
        backgroundColor: '#f59e0b',
        borderColor: '#f59e0b',
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
    candCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    candHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    candInfo: {
        flex: 1,
    },
    candName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    candRole: {
        fontSize: 13,
        color: '#94a3b8',
    },
    scoreBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: '#10b981',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    scoreText: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 16,
    },
    scoreLabel: {
        color: '#10b981',
        fontSize: 10,
        fontWeight: '600',
    },
    candMeta: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    metaText: {
        color: '#94a3b8',
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtnReject: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ef4444',
        alignItems: 'center',
    },
    actionBtnRejectText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14,
    },
    actionBtnShortlist: {
        flex: 1.5,
        flexDirection: 'row',
        backgroundColor: '#f59e0b',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnShortText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
