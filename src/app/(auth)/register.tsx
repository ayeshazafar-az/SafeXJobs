import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

import { adminSupabase } from '@/lib/adminSupabase';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
    const [role, setRole] = useState<'candidate' | 'company' | 'hiring_manager'>('candidate');

    // Shared fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');

    // Candidate Specific
    const [fullName, setFullName] = useState('');
    const [province, setProvince] = useState('');
    const [city, setCity] = useState('');
    const [cnic, setCnic] = useState('');

    // Company Specific
    const [companyName, setCompanyName] = useState('');
    const [industry, setIndustry] = useState('');
    const [website, setWebsite] = useState('');
    const [location, setLocation] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [description, setDescription] = useState('');
    const [registrationInfo, setRegistrationInfo] = useState('');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const handleRegister = async () => {
        if (!email || !password) {
            setErrorMsg('Please provide both email and password.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        // Sign up the user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    role,
                }
            }
        });

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        // Attempt to create a profile (Requires profiles table on Supabase)
        if (data.user) {
            // Build payload dynamically — only include fields with actual values.
            // This prevents 400 errors from columns that may not exist in the DB schema.
            const profilePayload: Record<string, any> = {
                id: data.user.id,
                role,
                email: email.trim(),
            };

            // Only add fields that have actual values (avoids sending non-existent columns)
            if (phone) profilePayload.phone = phone;
            if (role === 'company') {
                profilePayload.status = 'Pending';
                if (companyName) profilePayload.company_name = companyName;
                if (industry) profilePayload.industry = industry;
                if (website) profilePayload.website = website;
                if (location) profilePayload.company_location = location;
                if (description) profilePayload.company_description = description;
                if (registrationInfo) profilePayload.registration_info = registrationInfo;
            } else if (role === 'candidate') {
                if (fullName) profilePayload.full_name = fullName;
                if (cnic) profilePayload.cnic = cnic;
                if (province) profilePayload.province = province;
                if (city) profilePayload.city = city;
            } else if (role === 'hiring_manager') {
                if (fullName) profilePayload.full_name = fullName;
                // Note: DB doesn't have department/designation columns currently
            }

            console.log('[REGISTER] Inserting profile with keys:', Object.keys(profilePayload));
            const { error: profileError } = await adminSupabase.from('profiles').insert(profilePayload);

            if (profileError) {
                const debugStr = profileError.message || JSON.stringify(profileError);
                setErrorMsg(`DB CRASH: ${debugStr}`);

                // Force a complete logout so the stale auth user doesn't stick around, masking the failure
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            Alert.alert('Success', 'Your account has been fully verified & created in the database database!');
            router.replace('/(auth)/login');
        }

        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join SafeX Jobs and start your journey today.</Text>
                </View>

                <View style={styles.roleToggleContainer}>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'candidate' && styles.roleButtonActive]}
                        onPress={() => setRole('candidate')}
                    >
                        <Text style={[styles.roleButtonText, role === 'candidate' && styles.roleButtonTextActive]}>Candidate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'company' && styles.roleButtonActive]}
                        onPress={() => setRole('company')}
                    >
                        <Text style={[styles.roleButtonText, role === 'company' && styles.roleButtonTextActive]}>Company</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roleButton, role === 'hiring_manager' && styles.roleButtonActive]}
                        onPress={() => setRole('hiring_manager')}
                    >
                        <Text style={[styles.roleButtonText, role === 'hiring_manager' && styles.roleButtonTextActive]}>HM/Recruiter</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                    {/* Shared Fields */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+92 3XX XXXXXXX"
                            placeholderTextColor="#64748b"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Candidate Fields */}
                    {role === 'candidate' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ali Khan"
                                    placeholderTextColor="#64748b"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Province</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Punjab, Sindh..."
                                    placeholderTextColor="#64748b"
                                    value={province}
                                    onChangeText={setProvince}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>City</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Lahore"
                                    placeholderTextColor="#64748b"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>CNIC / Verification Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="XXXXX-XXXXXXX-X"
                                    placeholderTextColor="#64748b"
                                    value={cnic}
                                    onChangeText={setCnic}
                                    keyboardType="numeric"
                                />
                            </View>
                        </>
                    )}

                    {/* Company Fields */}
                    {role === 'company' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Company Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Acme Corp"
                                    placeholderTextColor="#64748b"
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Industry</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Tech, Finance..."
                                    placeholderTextColor="#64748b"
                                    value={industry}
                                    onChangeText={setIndustry}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Company Location</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Islamabad, Remote"
                                    placeholderTextColor="#64748b"
                                    value={location}
                                    onChangeText={setLocation}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Company Logo (Link/URL)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://imgur.com/logo.png"
                                    placeholderTextColor="#64748b"
                                    autoCapitalize="none"
                                    value={logoUrl}
                                    onChangeText={setLogoUrl}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Website</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://company.com"
                                    placeholderTextColor="#64748b"
                                    keyboardType="url"
                                    autoCapitalize="none"
                                    value={website}
                                    onChangeText={setWebsite}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Business Registration #</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Optional verified info"
                                    placeholderTextColor="#64748b"
                                    value={registrationInfo}
                                    onChangeText={setRegistrationInfo}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Company Description</Text>
                                <TextInput
                                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                                    placeholder="Tell candidates about your mission..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>
                        </>
                    )}

                    {/* Hiring Manager Fields */}
                    {role === 'hiring_manager' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput style={styles.input} placeholder="John Manager" placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName} />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Designation Title</Text>
                                <TextInput style={styles.input} placeholder="Technical Recruiter" placeholderTextColor="#64748b" value={companyName} onChangeText={setCompanyName} />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Department</Text>
                                <TextInput style={styles.input} placeholder="Human Resources" placeholderTextColor="#64748b" value={industry} onChangeText={setIndustry} />
                            </View>
                        </>
                    )}

                    <TouchableOpacity style={styles.loginButton} onPress={handleRegister} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Register</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.registerLink}>Sign in here</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        paddingVertical: 60,
    },
    header: {
        marginBottom: 24,
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
    roleToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 6,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#334155',
    },
    roleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    roleButtonActive: {
        backgroundColor: '#3b82f6',
    },
    roleButtonText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 14,
    },
    roleButtonTextActive: {
        color: '#ffffff',
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
});

