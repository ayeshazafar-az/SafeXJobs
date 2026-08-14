import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Mocked Job Data for presentation
const MOCK_JOBS = [
    { id: '1', title: 'Senior React Native Developer', company: 'Acme Corp', location: 'Remote', type: 'Full-Time', salary: '200k - 250k PKR', postedAt: '2 days ago' },
    { id: '2', title: 'Product Manager', company: 'Zenith Labs', location: 'Islamabad', type: 'Full-Time', salary: '150k - 280k PKR', postedAt: '5 hours ago' },
    { id: '3', title: 'UI/UX Designer', company: 'Creative Co.', location: 'Lahore', type: 'Contract', salary: '100k - 150k PKR', postedAt: '3 days ago' },
];

export default function FindJobsScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Find Jobs</Text>
                <Text style={styles.subtitle}>Explore thousands of top-tier opportunities.</Text>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search role, company, or keyword"
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Ionicons name="options" size={24} color="#f8fafc" style={{ marginLeft: 8 }} />
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    {['All', 'Remote', 'Full-Time', 'Contract', 'Islamabad', 'Lahore'].map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.jobsList}>
                {MOCK_JOBS.map((job) => (
                    <TouchableOpacity key={job.id} style={styles.jobCard}>
                        <View style={styles.jobMainInfo}>
                            <View style={styles.jobIcon}>
                                <Ionicons name="briefcase" size={24} color="#3b82f6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.jobTitle}>{job.title}</Text>
                                <Text style={styles.jobCompany}>{job.company}</Text>
                            </View>
                            <Ionicons name="bookmark-outline" size={24} color="#94a3b8" />
                        </View>

                        <View style={styles.jobTags}>
                            <View style={styles.tag}><Text style={styles.tagText}>{job.location}</Text></View>
                            <View style={styles.tag}><Text style={styles.tagText}>{job.type}</Text></View>
                        </View>

                        <View style={styles.jobFooter}>
                            <Text style={styles.jobSalary}>{job.salary}</Text>
                            <Text style={styles.jobTime}>{job.postedAt}</Text>
                        </View>
                    </TouchableOpacity>
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        color: '#f8fafc',
        marginLeft: 10,
        fontSize: 15,
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
    jobsList: {
        padding: 20,
    },
    jobCard: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    jobMainInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    jobIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    jobTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 4,
    },
    jobCompany: {
        fontSize: 14,
        color: '#94a3b8',
    },
    jobTags: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        backgroundColor: '#0f172a',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    tagText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingTop: 16,
    },
    jobSalary: {
        color: '#10b981',
        fontWeight: 'bold',
        fontSize: 14,
    },
    jobTime: {
        color: '#64748b',
        fontSize: 12,
    },
});
