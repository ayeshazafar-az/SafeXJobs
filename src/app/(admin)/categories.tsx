import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STORAGE_KEY = 'admin_setup_categories';

export default function CategoriesScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
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
                setCategories(['Software Development', 'Design', 'Marketing', 'Sales']);
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
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Categories</Text>
            </View>

            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Engineering, HR..."
                    placeholderTextColor={theme.textSecondary}
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
                        <Ionicons name="pricetag-outline" size={20} color={theme.primary} />
                        <Text style={styles.cardText}>{item}</Text>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeCategory(item)}>
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
        width: 48, height: 48, borderRadius: 12, backgroundColor: theme.primary,
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
