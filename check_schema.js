require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('COLUMNS:', Object.keys(data[0]));
    } else {
        // If no data, try to insert an empty object to trigger a schema error
        console.log('No data to read schema from. Trying a dummy insert to get schema info...');
        const { error: insertError } = await supabase.from('profiles').insert({ this_column_does_not_exist: true });
        console.log('Insert Error:', insertError);
    }
}

checkSchema();
