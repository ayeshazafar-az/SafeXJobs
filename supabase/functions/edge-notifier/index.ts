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
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

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
                // Dynamic HTML Email Styling Template
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0;">SafeX Jobs</h2>
                        </div>
                        <div style="padding: 32px; background-color: #ffffff;">
                            <h3 style="color: #334155; margin-top: 0;">${notification.title}</h3>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">${notification.body}</p>
                            ${notification.type === 'interview_update' ? `<br/><a href="#" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Details in App</a>` : ''}
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
                            &copy; ${new Date().getFullYear()} SafeX Jobs. All rights reserved.
                        </div>
                    </div>
                `;

                if (RESEND_API_KEY) {
                    const res = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
                        body: JSON.stringify({
                            from: 'SafeX Jobs <no-reply@safexjobs.com>',
                            to: [userEmail],
                            subject: notification.title,
                            html: emailHtml,
                        }),
                    });
                    console.log('Resend Email sent:', await res.json());
                } else if (SENDGRID_API_KEY) {
                    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SENDGRID_API_KEY}` },
                        body: JSON.stringify({
                            personalizations: [{ to: [{ email: userEmail }] }],
                            from: { email: 'no-reply@safexjobs.com', name: 'SafeX Jobs' },
                            subject: notification.title,
                            content: [{ type: 'text/html', value: emailHtml }]
                        }),
                    });
                    console.log('SendGrid Dispatch Status:', res.status);
                } else {
                    console.warn('CRITICAL: No REST Auth Keys found for Email Providers. Email aborted.');
                }
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
