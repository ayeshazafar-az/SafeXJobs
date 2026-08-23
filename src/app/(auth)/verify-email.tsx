import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';

export default function VerifyEmailScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const router = useRouter();
    const [checking, setChecking] = useState(false);
    const [resending, setResending] = useState(false);
    const [verified, setVerified] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-poll every 5 seconds to check if email was confirmed
    useEffect(() => {
        intervalRef.current = setInterval(async () => {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user?.email_confirmed_at) {
                setVerified(true);
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        }, 5000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (verified) {
            // Sign the user out so they go through the proper login flow
            supabase.auth.signOut();
            setTimeout(() => {
                if (Platform.OS === 'web') alert('Email verified! You can now sign in.');
                else Alert.alert('Email Verified!', 'Your email has been confirmed. Please sign in to continue.');
                router.replace('/(auth)/login');
            }, 500);
        }
    }, [verified]);

    const handleManualCheck = async () => {
        setChecking(true);
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.email_confirmed_at) {
            setVerified(true);
        } else {
            // Try refreshing the session
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData?.session?.user?.email_confirmed_at) {
                setVerified(true);
            } else {
                if (Platform.OS === 'web') alert('Email not yet verified. Please check your inbox and click the confirmation link.');
                else Alert.alert('Not Verified Yet', 'Please check your inbox and click the confirmation link, then try again.');
            }
        }
        setChecking(false);
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });
        setResending(false);
        if (error) {
            if (Platform.OS === 'web') alert('Failed to resend: ' + error.message);
            else Alert.alert('Resend Failed', error.message);
        } else {
            if (Platform.OS === 'web') alert('Verification email resent!');
            else Alert.alert('Email Resent', 'A new verification email has been sent to your inbox.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="mail-unread" size={64} color="#3b82f6" />
                </View>

                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                    We've sent a verification link to
                </Text>
                <Text style={styles.emailText}>{email || 'your email address'}</Text>
                <Text style={styles.instructions}>
                    Please check your inbox (and spam folder) and click the confirmation link. Once verified, you'll be able to sign in.
                </Text>

                {/* Manual Check Button */}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleManualCheck} disabled={checking}>
                    {checking ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Resend Button */}
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleResend} disabled={resending}>
                    {resending ? (
                        <ActivityIndicator color="#3b82f6" />
                    ) : (
                        <>
                            <Ionicons name="refresh" size={18} color="#3b82f6" style={{ marginRight: 8 }} />
                            <Text style={styles.secondaryBtnText}>Resend Verification Email</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
                    <Ionicons name="arrow-back" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
                    <Text style={styles.backBtnText}>Back to Login</Text>
                </TouchableOpacity>

                {/* Auto-polling indicator */}
                <View style={styles.pollingIndicator}>
                    <View style={styles.pollingDot} />
                    <Text style={styles.pollingText}>Auto-checking every 5 seconds...</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 2, borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    title: {
        fontSize: 28, fontWeight: '800', color: '#f8fafc',
        marginBottom: 12, textAlign: 'center',
    },
    subtitle: {
        fontSize: 15, color: '#94a3b8', textAlign: 'center',
    },
    emailText: {
        fontSize: 16, fontWeight: 'bold', color: '#60a5fa',
        marginTop: 4, marginBottom: 16, textAlign: 'center',
    },
    instructions: {
        fontSize: 14, color: '#64748b', textAlign: 'center',
        lineHeight: 22, marginBottom: 32, paddingHorizontal: 10,
    },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#3b82f6', borderRadius: 12,
        paddingVertical: 16, paddingHorizontal: 32, width: '100%',
        marginBottom: 12,
        shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    primaryBtnText: {
        color: '#fff', fontSize: 16, fontWeight: 'bold',
    },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)',
        borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%',
        marginBottom: 16,
    },
    secondaryBtnText: {
        color: '#3b82f6', fontSize: 14, fontWeight: '600',
    },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 24,
    },
    backBtnText: {
        color: '#94a3b8', fontSize: 14,
    },
    pollingIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    },
    pollingDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#10b981',
    },
    pollingText: {
        color: '#10b981', fontSize: 12, fontWeight: '500',
    },
});
