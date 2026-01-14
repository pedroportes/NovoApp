
const payload = {
    event: "messages.upsert",
    instance: "Desentupidora Nossa Cidade",
    data: {
        key: {
            fromMe: false,
            remoteJid: "554199999999@s.whatsapp.net"
        },
        message: {
            conversation: "PING"
        }
    }
};

async function test() {
    try {
        const res = await fetch('https://dltqxfyrltgbudtzxzot.supabase.co/functions/v1/evolution-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

test();
