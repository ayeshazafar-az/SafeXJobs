const fs = require('fs');

async function run() {
    const lines = fs.readFileSync('.env', 'utf8').split('\n');
    let url, key;
    lines.forEach(l => {
        if (l.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
        if (l.startsWith('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
    });

    console.log('Sending request to', url + '/rest/v1/profiles?limit=1');
    try {
        const response = await fetch(url + '/rest/v1/profiles?limit=1', {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const text = await response.text();
        console.log('API RESPONSE:', text);
        try {
            const data = JSON.parse(text);
            if (data && data.length > 0) {
                console.log('\nACTUAL COLUMNS:', Object.keys(data[0]).join(', '));
            } else {
                console.log('\nNo rows to parse columns from. Try inserting a row via app to see the error.');
            }
        } catch (e) { }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

run();
