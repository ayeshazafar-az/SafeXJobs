import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'admin_setup_locations';

export default function LocationsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
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
                setLocations(['Remote', 'Islamabad', 'Lahore', 'Karachi', 'Dubai', 'London']);
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
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Locations</Text>
            </View>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., New York, Sydney..."
                    placeholderTextColor={theme.textSecondary}
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
                        <Ionicons name="location-outline" size={20} color={theme.success} />
                        <Text style={styles.cardText}>{item}</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeLocation(item)}>
                            <Ionicons name="trash-outline" size={20} color={theme.danger} />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </KeyboardAvoidingView>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        padding: 24, paddingTop: 60, paddingBottom: 20,
        backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: theme.border
    },
    title: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    inputArea: {
        flexDirection: 'row', padding: 20,
        backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border
    },
    input: {
        flex: 1, backgroundColor: theme.background, color: theme.text,
        borderRadius: 12, paddingHorizontal: 16, height: 48,
        borderWidth: 1, borderColor: theme.border
    },
    addBtn: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: theme.success,
        alignItems: 'center', justifyContent: 'center', marginLeft: 12
    },
    list: { padding: 20 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.card, padding: 16, borderRadius: 12,
        marginBottom: 12, borderWidth: 1, borderColor: theme.border
    },
    cardText: { flex: 1, marginLeft: 12, color: theme.text, fontSize: 16, fontWeight: '500' },
    deleteBtn: { padding: 8, backgroundColor: `${theme.danger}15`, borderRadius: 8 }
});
