import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'admin_setup_categories';

export default function CategoriesScreen() {
    const router = useRouter();
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                setCategories(JSON.parse(data));
            } else {
                setCategories(['Software Development', 'Design', 'Marketing', 'Sales']); // Defaults
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const saveCategories = async (cats: string[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
            setCategories(cats);
        } catch (e) {
            console.error('Failed to save categories', e);
            Alert.alert('Error', 'Failed to save category.');
        }
    };

    const addCategory = () => {
        if (!newCategory.trim()) return;
        if (categories.includes(newCategory.trim())) {
            Alert.alert('Duplicate', 'This category already exists.');
            return;
        }
        const updated = [...categories, newCategory.trim()].sort();
        saveCategories(updated);
        setNewCategory('');
    };

    const removeCategory = (cat: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Delete category "${cat}"?`)) {
                saveCategories(categories.filter(c => c !== cat));
            }
        } else {
            Alert.alert('Delete Category', `Are you sure you want to delete "${cat}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => saveCategories(categories.filter(c => c !== cat)) }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Categories</Text>
            </View>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Engineering, HR..."
                    placeholderTextColor="#64748b"
                    value={newCategory}
                    onChangeText={setNewCategory}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Ionicons name="pricetag-outline" size={20} color="#3b82f6" />
                        <Text style={styles.cardText}>{item}</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeCategory(item)}>
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
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#3b82f6',
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
