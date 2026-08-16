import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function FindJobsScreen() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [applyingTo, setApplyingTo] = useState<string | null>(null);

    useEffect(() => {
        const fetchJobs = async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    profiles (
                        company_name,
                        full_name
                    )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data) {
                setJobs(data);
            } else {
                console.error("Error fetching jobs", error);
            }
            setLoading(false);
        };

        fetchJobs();
    }, []);

    const handleApply = async (jobId: string, jobTitle: string, companyName: string) => {
        if (!user) return;
        setApplyingTo(jobId);

        // Basic check if application already exists (to prevent duplicates)
        const { data: existingApp } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('candidate_id', user.id)
            .single();

        if (existingApp) {
            Alert.alert('Already Applied', 'You have already submitted an application for this job.');
            setApplyingTo(null);
            return;
        }

        const { error } = await supabase.from('applications').insert({
            job_id: jobId,
            candidate_id: user.id,
            status: 'Applied'
        });

        setApplyingTo(null);

        if (error) {
            Alert.alert('Application Failed', error.message);
        } else {
            Alert.alert(
                'Application Submitted',
                `Your profile has been successfully sent to ${companyName} for the ${jobTitle} position! Check your Application Tracker for updates.`
            );
        }
    };

    // Filter jobs based on search query and active filter
    const filteredJobs = jobs.filter(job => {
        const queryMatch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.profiles?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const filterMatch = activeFilter === 'All' ||
            job.location?.includes(activeFilter) ||
            job.job_type === activeFilter;
        return queryMatch && filterMatch;
    });

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
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
                ) : filteredJobs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Ionicons name="search-outline" size={64} color="#334155" />
                        <Text style={{ color: '#94a3b8', marginTop: 16 }}>No jobs found matching your search.</Text>
                    </View>
                ) : (
                    filteredJobs.map((job) => (
                        <TouchableOpacity key={job.id} style={styles.jobCard}>
                            <View style={styles.jobMainInfo}>
                                <View style={styles.jobIcon}>
                                    <Ionicons name="briefcase" size={24} color="#3b82f6" />
                                </View>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                                    <Text style={styles.jobCompany}>{job.profiles?.company_name || job.profiles?.full_name || 'Anonymous Company'}</Text>
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

                            <View style={styles.jobTags}>
                                {job.location && <View style={styles.tag}><Text style={styles.tagText}>{job.location}</Text></View>}
                                {job.job_type && <View style={styles.tag}><Text style={styles.tagText}>{job.job_type}</Text></View>}
                            </View>

                            <View style={styles.jobFooter}>
                                <Text style={styles.jobSalary}>
                                    {job.salary_min && job.salary_max
                                        ? `${job.salary_min}k - ${job.salary_max}k PKR`
                                        : 'Salary not disclosed'}
                                </Text>
                                <Text style={styles.jobTime}>
                                    {new Date(job.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
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
    applyBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
});
