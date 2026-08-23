import { supabase } from './supabase';

export const checkReminders = async (userId: string) => {
    if (!userId) return;

    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Check for tests due within 48 hours
    const { data: upcomingTests, error: testsError } = await supabase
        .from('applications')
        .select('id, test_deadline, jobs(title)')
        .eq('candidate_id', userId)
        .eq('status', 'Test Assigned')
        .gt('test_deadline', now.toISOString())
        .lt('test_deadline', fortyEightHoursFromNow.toISOString());

    if (!testsError && upcomingTests) {
        for (const test of upcomingTests) {
            const jobData = Array.isArray(test.jobs) ? test.jobs[0] : test.jobs;
            const title = `🚨 Action Required: Test Deadline Approaching!`;
            const body = `Your test for ${jobData?.title || 'a job'} is due soon! Please submit it before ${new Date(test.test_deadline).toLocaleString()}.`;

            // Check if reminder already sent for this specific test app
            const { data: existingTestNotifs } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('title', title)
                .like('body', `%${jobData?.title || 'a job'}%`)
                .single();

            if (!existingTestNotifs) {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    title: title,
                    body: body,
                    type: 'system',
                });
            }
        }
    }

    // 2. Check for interviews scheduled within 24 hours
    const { data: upcomingInterviews, error: interviewsError } = await supabase
        .from('applications')
        .select('id, interview_date, jobs(title)')
        .eq('candidate_id', userId)
        .eq('status', 'Interview Scheduled')
        .gt('interview_date', now.toISOString())
        .lt('interview_date', twentyFourHoursFromNow.toISOString());

    if (!interviewsError && upcomingInterviews) {
        for (const interview of upcomingInterviews) {
            const jobData = Array.isArray(interview.jobs) ? interview.jobs[0] : interview.jobs;
            const title = `🕒 Friendly Reminder: Upcoming Interview`;
            const body = `Your interview for the ${jobData?.title || 'a job'} position is coming up at ${new Date(interview.interview_date).toLocaleString()}. Good luck!`;

            // Check if reminder already sent
            const { data: existingInterviewNotifs } = await supabase
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('title', title)
                .like('body', `%${jobData?.title || 'a job'}%`)
                .single();

            if (!existingInterviewNotifs) {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    title: title,
                    body: body,
                    type: 'system',
                });
            }
        }
    }
};
