import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            <Stack.Screen name="login" options={{ title: 'Login' }} />
            <Stack.Screen name="register" options={{ title: 'Register' }} />
            <Stack.Screen name="verify-email" options={{ title: 'Verify Email' }} />
        </Stack>
    );
}
