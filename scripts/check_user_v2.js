
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dltqxfyrltgbudtzxzot.supabase.co';
const supabaseKey = 'sb_publishable__BxAiNOgqk_mZs6epZxoyg_juUcuv7r'; // ANON KEY

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndResetUser() {
    const email = 'muriloportelaservicos@gmail.com';
    console.log(`Verificando usuário: ${email}...`);

    try {
        // 1. Check if user exists in public.usuarios 
        const { data: userProfile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
        } else if (userProfile) {
            console.log('✅ Usuário encontrado na tabela `usuarios`:', userProfile);
        } else {
            console.log('⚠️ Usuário NÃO encontrado na tabela `usuarios`.');
        }

        // 2. Trigger Password Reset
        console.log('Tentando enviar e-mail de redefinição de senha...');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://app.gerenciaservicos.com.br/update-password',
        });

        if (error) {
            console.error('❌ Erro ao enviar e-mail:', error);
        } else {
            console.log('✅ E-mail de redefinição enviado com sucesso.');
        }

    } catch (err) {
        console.error('Erro inesperado:', err);
    }
}

checkAndResetUser();
