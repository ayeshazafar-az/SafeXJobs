import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function PostJobPlaceholder() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Post a New Job</Text>
                <Text style={styles.subtitle}>Create an exciting listing to attract top talent.</Text>
            </View>

            <View style={styles.emptyState}>
                <Ionicons name="rocket-outline" size={60} color="#f59e0b" style={styles.icon} />
                <Text style={styles.emptyStateTitle}>Ready to Hire?</Text>
                <Text style={styles.emptyStateText}>We will build the extensive job posting form in Module 4!</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 24,
        paddingTop: 60,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        lineHeight: 24,
    },
    emptyState: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
    },
    icon: {
        marginBottom: 20,
        opacity: 0.9,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
    },
});
