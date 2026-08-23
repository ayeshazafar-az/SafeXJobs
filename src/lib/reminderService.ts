import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // 3. Check for Job Alerts (jobs posted in the last 72 hours)
    try {
        const key = `job_alerts_${userId}`;
        const existingAlertsStr = await AsyncStorage.getItem(key);
        if (existingAlertsStr) {
            const alerts = JSON.parse(existingAlertsStr);
            if (alerts.length > 0) {
                const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

                // Fetch recent active jobs
                const { data: recentJobs } = await supabase
                    .from('jobs')
                    .select('id, title, location, required_experience, required_education, salary_min, salary_max, job_type, created_at, profiles!jobs_company_id_fkey(company_name)')
                    .eq('is_active', true)
                    .gte('created_at', seventyTwoHoursAgo);

                if (recentJobs && recentJobs.length > 0) {
                    for (const job of recentJobs) {
                        for (const alert of alerts) {
                            // Match logic
                            const cityMatch = !alert.city || (job.location || '').toLowerCase().includes(alert.city.toLowerCase());
                            const provMatch = !alert.province || (job.location || '').toLowerCase().includes(alert.province.toLowerCase());
                            const expMatch = !alert.experience || (job.required_experience || '').toLowerCase().includes(alert.experience.toLowerCase());
                            const eduMatch = alert.education === 'Any' || !alert.education || (job.required_education || '').toLowerCase().includes(alert.education.toLowerCase());
                            const workModeMatch = alert.workMode === 'All' || !alert.workMode || (job.job_type || '').toLowerCase().includes(alert.workMode.toLowerCase());
                            const salaryMatch = !alert.salaryMin || (job.salary_min && job.salary_min >= parseInt(alert.salaryMin));

                            if (cityMatch && provMatch && expMatch && eduMatch && workModeMatch && salaryMatch) {
                                // Prevent duplicate notifications for the same job and user
                                const jobTitle = job.title;
                                const companyObj = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
                                const companyName = (companyObj as any)?.company_name;
                                const notifTitle = '🔔 Job Alert Match!';
                                const notifBody = `A new job "${jobTitle}" at ${companyName || 'a company'} matches your alert preferences. Check it out!`;

                                const { data: existingJobAlert } = await supabase
                                    .from('notifications')
                                    .select('id')
                                    .eq('user_id', userId)
                                    .eq('title', notifTitle)
                                    .like('body', `%${jobTitle}%`)
                                    .single();

                                if (!existingJobAlert) {
                                    await supabase.from('notifications').insert({
                                        user_id: userId,
                                        title: notifTitle,
                                        body: notifBody,
                                        type: 'system',
                                    });
                                }
                                break; // Break out of alert loop if this job matched one alert
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Job Alerts error:', e);
    }
};
