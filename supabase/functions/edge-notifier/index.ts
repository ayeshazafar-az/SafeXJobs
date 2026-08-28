// SafeX Jobs - Edge Notifier Service (Deno / Supabase Edge Functions)
// Path: supabase/functions/edge-notifier/index.ts
//
// Description:
// A template Edge Function for dispatching transactional Emails (via Resend/SendGrid) 
// and processing automated 24-hr Deadline Reminders via Supabase CRON. 

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// You would store your Email Provider Key in Supabase Secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Service key required for CRON jobs to bypass RLS
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { record, type } = await req.json();

        // SCENARIO 1: Transactional Emails for Notifications
        if (type === 'INSERT' && record.table === 'notifications') {
            const notification = record.record;

            // Example: Dispatch Email using Resend API
            // Fetch User Email
            const { data: userData } = await supabase.auth.admin.getUserById(notification.user_id);
            const userEmail = userData?.user?.email;

            if (userEmail) {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'SafeX Jobs <no-reply@safexjobs.com>',
                        to: [userEmail],
                        subject: notification.title,
                        html: `<p>${notification.body}</p>`,
                    }),
                });
                console.log('Email sent:', await res.json());
            }

            return new Response(JSON.stringify({ success: true, method: 'email_dispatched' }), { headers: { "Content-Type": "application/json" } });
        }

        // SCENARIO 2: CRON Job Payload - 24-Hour Test Reminders
        if (type === 'CRON_TEST_REMINDERS') {
            // Find applications with 'Test Assigned' status where deadline is exactly between 12-24 hours from now
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Query logic here...
            const { data: expiringTests } = await supabase
                .from('applications')
                .select('id, candidate_id, test_deadline')
                .eq('status', 'Test Assigned')
                .lte('test_deadline', tomorrow.toISOString())
                .gt('test_deadline', now.toISOString());

            if (expiringTests && expiringTests.length > 0) {
                // Insert Warning notifications for each user
                const reminders = expiringTests.map(app => ({
                    user_id: app.candidate_id,
                    title: '⏳ Urgent: Test Deadline Approaching',
                    body: 'You have less than 24 hours to complete your assigned assessment. After the deadline, your submission will be rejected by the system.',
                    type: 'deadline_warning'
                }));
                await supabase.from('notifications').insert(reminders);
            }

            return new Response(JSON.stringify({ success: true, processed: expiringTests?.length || 0 }), { headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ success: true, message: 'No action taken.' }), { headers: { "Content-Type": "application/json" } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
