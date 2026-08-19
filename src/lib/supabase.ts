import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase URL or Anon Key. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

const customStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

// Use AsyncStorage as the secure fallback storage option on mobile devices 
// to prevent the session token from dropping out of memory on native renders.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        ...(customStorage && { storage: customStorage }),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
