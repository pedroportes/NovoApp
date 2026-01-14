
const payload = {
    url: "https://homologacao.focusnfe.com.br/v2/nfse",
    method: "GET",
    token: "Ljn2hyK0jwaJrecgrmkEdGXJvaEhSrYu"
};

async function test() {
    try {
        const res = await fetch('https://dltqxfyrltgbudtzxzot.supabase.co/functions/v1/focus-nfe-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

test();
