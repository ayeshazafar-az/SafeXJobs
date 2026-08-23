import { supabase } from './supabase';

/**
 * Service to simulate external Email & SMS triggers.
 * In a production environment, this would call a Supabase Edge Function to integrate with Resend/Twilio.
 */
export const triggerExternalNotification = async (userId: string, title: string, body: string, type: 'email' | 'sms' = 'email') => {
    try {
        console.log(`[${type.toUpperCase()} DISPATCHED] To User: ${userId} | Subject: ${title}`);

        // Fetch user preferences/details
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone_number, notification_preferences')
            .eq('id', userId)
            .single();

        if (profile?.notification_preferences === 'none') {
            console.log('User has disabled external notifications. Opting out.');
            return;
        }

        // Mock Payload that would be sent to an Edge Function via HTTP POST
        const externalPayload = {
            userId,
            channel: type,
            subject: title,
            content: body,
            recipientPhone: profile?.phone_number || null,
        };

        console.log('Sending Payload to Edge Function:', JSON.stringify(externalPayload, null, 2));

        // Simulating network delay for external API call
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`[EXTERNAL NOTIFICATION SUCCESS] Sent via ${type}`);
    } catch (e) {
        console.error('Failed to trigger external notification', e);
    }
};
