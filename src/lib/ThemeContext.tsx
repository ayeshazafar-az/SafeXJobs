import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeType = 'dark' | 'light';

export const lightTheme = {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#e2e8f0',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    headerBg: '#ffffff',
    overlay: 'rgba(0,0,0,0.5)',
};

export const darkTheme = {
    background: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    danger: '#f43f5e',
    success: '#10b981',
    warning: '#f59e0b',
    headerBg: '#1e293b',
    overlay: 'rgba(0,0,0,0.8)',
};

interface ThemeContextType {
    theme: typeof darkTheme;
    themeMode: ThemeType;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState<ThemeType>('dark'); // default Dark

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('appTheme') as ThemeType | null;
            if (savedTheme) {
                setThemeMode(savedTheme);
            } else {
                setThemeMode(systemScheme === 'light' ? 'light' : 'dark');
            }
        };
        loadTheme();
    }, [systemScheme]);

    const toggleTheme = async () => {
        const newTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);
        await AsyncStorage.setItem('appTheme', newTheme);
    };

    const theme = themeMode === 'light' ? lightTheme : darkTheme;

    return (
        <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};
