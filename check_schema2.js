const fs = require('fs');

async function run() {
    const lines = fs.readFileSync('.env', 'utf8').split('\n');
    let url, key;
    lines.forEach(l => {
        if (l.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
        if (l.startsWith('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
    });

    console.log('Fetching OpenAPI spec to get exact applications schema...');
    try {
        const response = await fetch(url + '/rest/v1/', {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await response.json();

        if (data && data.definitions && data.definitions.tests && data.definitions.tests.properties) {
            console.log('\nACTUAL TESTS COLUMNS:\n', data.definitions.tests.properties);
        } else {
            console.log('\nCould not find tests definitions in OpenAPI spec.', Object.keys(data.definitions || {}));
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

run();
