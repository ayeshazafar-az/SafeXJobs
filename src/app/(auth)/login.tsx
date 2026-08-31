import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView, Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [step, setStep] = useState<'login' | 'verify'>('login');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        setLoading(true);
        setErrorMsg('');

        if (loginMethod === 'email') {
            if (!email || !password) {
                setErrorMsg('Please carefully provide both email and password.');
                setLoading(false);
                return;
            }
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (error) setErrorMsg(error.message);
        } else {
            if (!phone) {
                setErrorMsg('Please provide a valid phone number including country code (e.g. +92).');
                setLoading(false);
                return;
            }
            const { error } = await supabase.auth.signInWithOtp({
                phone: phone.trim(),
            });
            if (error) {
                setErrorMsg(error.message);
            } else {
                setStep('verify');
            }
        }
        setLoading(false);
        // Auth state listener in RootLayout navigates the user automatically upon successful session creation.
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            setErrorMsg('Please enter the 6-digit code sent to your phone.');
            return;
        }
        setLoading(true);
        setErrorMsg('');
        const { error, data } = await supabase.auth.verifyOtp({
            phone: phone.trim(),
            token: otp,
            type: 'sms',
        });
        setLoading(false);
        if (error) {
            setErrorMsg(error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to SafeX Jobs to explore top tier opportunities and elite talent.</Text>
                </View>

                <View style={styles.form}>
                    {step === 'login' ? (
                        <>
                            {/* Login Method Toggle */}
                            <View style={styles.segmentedControl}>
                                <TouchableOpacity style={[styles.segmentBtn, loginMethod === 'email' && styles.segmentBtnActive]} onPress={() => setLoginMethod('email')}>
                                    <Text style={[styles.segmentBtnText, loginMethod === 'email' && styles.segmentBtnTextActive]}>Email</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.segmentBtn, loginMethod === 'phone' && styles.segmentBtnActive]} onPress={() => setLoginMethod('phone')}>
                                    <Text style={[styles.segmentBtnText, loginMethod === 'phone' && styles.segmentBtnTextActive]}>Phone (SMS)</Text>
                                </TouchableOpacity>
                            </View>

                            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                            {loginMethod === 'email' ? (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Email Address</Text>
                                        <TextInput
                                            style={styles.input} placeholder="you@example.com" placeholderTextColor="#64748b"
                                            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                                        />
                                    </View>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Password</Text>
                                        <View style={styles.passwordWrapper}>
                                            <TextInput
                                                style={styles.passwordInput} placeholder="••••••••" placeholderTextColor="#64748b"
                                                value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                                            />
                                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#64748b" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <TextInput
                                        style={styles.input} placeholder="+1234567890" placeholderTextColor="#64748b"
                                        value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                                    />
                                </View>
                            )}

                            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>{loginMethod === 'email' ? 'Sign In' : 'Send Verification Code'}</Text>}
                            </TouchableOpacity>

                            <View style={styles.footerRow}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <Link href="/(auth)/register" asChild>
                                    <TouchableOpacity>
                                        <Text style={styles.registerLink}>Sign up here</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </>
                    ) : (
                        <View>
                            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Enter 6-Digit OTP</Text>
                                <TextInput
                                    style={styles.input} placeholder="123456" placeholderTextColor="#64748b"
                                    value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}
                                />
                            </View>
                            
                            <TouchableOpacity style={styles.loginButton} onPress={handleVerifyOtp} disabled={loading}>
                                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loginButtonText}>Verify & Login</Text>}
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => setStep('login')}>
                                <Text style={styles.registerLink}>Cancel & Return</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
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
        padding: 24,
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
    form: {
        backgroundColor: '#1e293b',
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    errorText: {
        color: '#ef4444',
        marginBottom: 16,
        fontSize: 14,
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        color: '#e2e8f0',
        marginBottom: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        color: '#f8fafc',
        fontSize: 16,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
    },
    passwordInput: {
        flex: 1,
        padding: 16,
        color: '#f8fafc',
        fontSize: 16,
    },
    eyeIcon: {
        padding: 16,
    },
    loginButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    registerLink: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: 'bold',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentBtnActive: {
        backgroundColor: '#1e293b',
    },
    segmentBtnText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },
    segmentBtnTextActive: {
        color: '#f8fafc',
    },
});
