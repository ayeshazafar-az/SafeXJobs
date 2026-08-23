import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'admin_setup_locations';

export default function LocationsScreen() {
    const router = useRouter();
    const [locations, setLocations] = useState<string[]>([]);
    const [newLocation, setNewLocation] = useState('');

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                setLocations(JSON.parse(data));
            } else {
                setLocations(['Remote', 'Islamabad', 'Lahore', 'Karachi', 'Dubai', 'London']); // Defaults
            }
        } catch (e) {
            console.error('Failed to load locations', e);
        }
    };

    const saveLocations = async (locs: string[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locs));
            setLocations(locs);
        } catch (e) {
            console.error('Failed to save locations', e);
            Alert.alert('Error', 'Failed to save location.');
        }
    };

    const addLocation = () => {
        if (!newLocation.trim()) return;
        if (locations.includes(newLocation.trim())) {
            Alert.alert('Duplicate', 'This location already exists.');
            return;
        }
        const updated = [...locations, newLocation.trim()].sort();
        saveLocations(updated);
        setNewLocation('');
    };

    const removeLocation = (loc: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Delete location "${loc}"?`)) {
                saveLocations(locations.filter(l => l !== loc));
            }
        } else {
            Alert.alert('Delete Location', `Are you sure you want to delete "${loc}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => saveLocations(locations.filter(l => l !== loc)) }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Locations</Text>
            </View>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., New York, Sydney..."
                    placeholderTextColor="#64748b"
                    value={newLocation}
                    onChangeText={setNewLocation}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addLocation}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={locations}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Ionicons name="location-outline" size={20} color="#10b981" />
                        <Text style={styles.cardText}>{item}</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeLocation(item)}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#334155'
    },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    inputArea: {
        flexDirection: 'row', padding: 20,
        backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155'
    },
    input: {
        flex: 1, backgroundColor: '#0f172a', color: '#f8fafc',
        borderRadius: 12, paddingHorizontal: 16, height: 48,
        borderWidth: 1, borderColor: '#334155'
    },
    addBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#10b981',
        alignItems: 'center', justifyContent: 'center', marginLeft: 12
    },
    list: { padding: 20 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1e293b', padding: 16, borderRadius: 12,
        marginBottom: 12, borderWidth: 1, borderColor: '#334155'
    },
    cardText: { flex: 1, marginLeft: 12, color: '#f8fafc', fontSize: 16, fontWeight: '500' },
    deleteBtn: { padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }
});
