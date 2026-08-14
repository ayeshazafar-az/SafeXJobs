import { StyleSheet, Text, View } from 'react-native';

export default function FindJobsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Find Jobs</Text>
            <Text style={styles.subtitle}>Explore thousands of top-tier opportunities.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
    },
});
