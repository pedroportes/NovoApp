// Configuração da Fiscal Contora por empresa (etapa 1: token, teste de conexão e diagnóstico).
// O token fica em public.empresa_nfse_segredos (sem acesso pelo navegador) e nunca é devolvido.
// Deploy: npx supabase functions deploy nfse-contora
// Usa as variáveis padrão das Edge Functions: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CONTORA_API = 'https://fiscal.contora.com.br/api/v1'

const allowedOrigins = [
    'https://app.gerenciaservicos.com.br',
    'http://localhost:5173',
    'http://localhost:4173'
]

function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Vary': 'Origin'
    }
}

const soDigitos = (s: unknown) => String(s ?? '').replace(/\D/g, '')

async function contora(token: string, path: string, init: RequestInit = {}) {
    const res = await fetch(`${CONTORA_API}${path}`, {
        ...init,
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', ...(init.headers || {}) }
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
}

// Resumo da empresa da Contora, sem dados sensíveis
function resumoEmpresa(c: any) {
    return {
        id: c.id,
        cnpj: c.document,
        razao_social: c.legal_name,
        nome_fantasia: c.trade_name,
        cidade: c.city_name,
        uf: c.state_code,
        regime: c.tax_regime,
        ambiente_padrao: c.default_environment,
        certificado_ate: c.certificate?.valid_until ?? null,
        tem_certificado: !!c.has_certificate,
    }
}

serve(async (req) => {
    const headers = corsHeaders(req.headers.get('origin'))
    if (req.method === 'OPTIONS') return new Response('ok', { headers })

    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

    try {
        // 1. Usuário logado e sua empresa
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ ok: false, erro: 'Não autenticado' }, 401)

        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) return json({ ok: false, erro: 'Sessão inválida' }, 401)

        const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

        const { data: usuario } = await admin.from('usuarios').select('empresa_id, cargo').eq('id', user.id).single()
        if (!usuario?.empresa_id) return json({ ok: false, erro: 'Usuário sem empresa vinculada' }, 403)
        const empresaId = usuario.empresa_id as string
        const ehTecnico = ['tecnico', 'técnico'].includes(String(usuario.cargo || '').toLowerCase())

        const { acao, token, cnpj, os_id, justificativa } = await req.json().catch(() => ({}))

        const lerToken = async () => {
            const { data } = await admin.from('empresa_nfse_segredos').select('contora_token').eq('empresa_id', empresaId).maybeSingle()
            return (data?.contora_token as string | null) || null
        }

        // 2. Ações
        if (acao === 'carregar') {
            return json({ ok: true, token_definido: !!(await lerToken()) })
        }

        // ===== Emissão pelas OS (qualquer usuário da empresa, como na Focus) =====
        if (acao === 'emitir' || acao === 'status' || acao === 'cancelar') {
            const t = await lerToken()
            if (!t) return json({ ok: false, erro: 'A Contora não está conectada. Vá em Configurações → Nota fiscal e salve o token.' })

            const { data: cfg } = await admin.from('empresa_nfse_config')
                .select('provedor, contora_ambiente, contora_cnpj, contora_empresa_id, contora_total_tax_rate_sn')
                .eq('empresa_id', empresaId).maybeSingle()
            if (!cfg?.contora_cnpj || !cfg?.contora_empresa_id) {
                return json({ ok: false, erro: 'Escolha a empresa emissora: Configurações → Nota fiscal → Testar conexão.' })
            }
            const cnpjEmissor = soDigitos(cfg.contora_cnpj)
            const hdr = { 'X-Company-Document': cnpjEmissor }

            const { data: os } = await admin.from('ordens_servico')
                .select('id, empresa_id, cliente_id, valor_total, descricao, descricao_servico, nfe_status, nfe_ref, nfe_tipo')
                .eq('id', os_id).eq('empresa_id', empresaId).maybeSingle()
            if (!os) return json({ ok: false, erro: 'Ordem de serviço não encontrada.' }, 404)

            const atualizarOS = async (campos: Record<string, unknown>) => {
                await admin.from('ordens_servico').update(campos).eq('id', os.id)
                return campos
            }
            const docId = String(os.nfe_ref || '').startsWith('contora:') ? String(os.nfe_ref).slice(8) : null

            // --- Emitir: rascunho + despacho ---
            if (acao === 'emitir') {
                if (os.nfe_status === 'autorizado' && docId) return json({ ok: true, estado: 'autorizado', os: {} })
                const valor = Number(os.valor_total || 0)
                if (!(valor > 0)) return json({ ok: false, erro: 'A OS está sem valor. Informe o valor antes de emitir a nota.' })

                const emp = await contora(t, `/companies/${cfg.contora_empresa_id}`)
                const s = emp.data?.data?.settings || {}
                const regime = emp.data?.data?.tax_regime
                const pctSimples = cfg.contora_total_tax_rate_sn != null ? Number(cfg.contora_total_tax_rate_sn) : null
                if (regime === 'simples' && !(pctSimples! > 0)) {
                    return json({ ok: false, erro: 'Falta o % total de tributos do Simples (DAS) em Configurações → Nota fiscal.' })
                }

                // Tomador (opcional no padrão nacional)
                const { data: cli } = os.cliente_id
                    ? await admin.from('clientes').select('nome_razao, nome, cpf_cnpj, documento, email, whatsapp, telefone, logradouro, endereco, numero, bairro, cidade, uf, cep, codigo_municipio').eq('id', os.cliente_id).maybeSingle()
                    : { data: null }
                let taker: Record<string, unknown> | undefined
                const doc = soDigitos(cli?.cpf_cnpj || cli?.documento)
                if (cli && (doc.length === 11 || doc.length === 14)) {
                    taker = { name: String(cli.nome_razao || cli.nome || 'Cliente').trim().slice(0, 150), document: doc }
                    if (cli.email?.trim()) taker.email = cli.email.trim()
                    const fone = soDigitos(cli.whatsapp || cli.telefone)
                    if (fone.length >= 10) taker.phone = fone
                    const cep = soDigitos(cli.cep)
                    let ibge = soDigitos(cli.codigo_municipio)
                    if (ibge.length !== 7 && cep.length === 8) {
                        const via = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r => r.json()).catch(() => null)
                        ibge = soDigitos(via?.ibge)
                    }
                    const rua = String(cli.logradouro || cli.endereco || '').trim()
                    if (ibge.length === 7 && cep.length === 8 && rua) {
                        taker.address = {
                            street: rua.slice(0, 125), number: String(cli.numero || 'S/N').slice(0, 10),
                            district: String(cli.bairro || 'Centro').slice(0, 60),
                            city_code: ibge, state_code: String(cli.uf || '').toUpperCase() || undefined, postal_code: cep,
                        }
                    }
                }

                const servico: Record<string, unknown> = {
                    description: `Servicos ref. a OS #${String(os.id).slice(0, 8)}: ${os.descricao_servico || os.descricao || 'Desentupimento e Limpeza de Esgotos'}`.slice(0, 1000),
                    iss_withheld: false,
                    iss_tax_situation: 'tributavel',
                }
                if (/^\d{6}$/.test(soDigitos(s.nfse_service_code_default))) servico.national_tax_code = soDigitos(s.nfse_service_code_default)
                if (/^\d{7}$/.test(soDigitos(s.nfse_cnae_default))) servico.cnae = soDigitos(s.nfse_cnae_default)
                if (s.nfse_iss_rate_default != null) servico.iss_rate = Number(s.nfse_iss_rate_default)
                if (/^\d{9}$/.test(soDigitos(s.nfse_nbs_default))) servico.nbs_code = soDigitos(s.nfse_nbs_default)
                if (pctSimples! > 0) servico.total_tax_rate_sn = pctSimples

                const falhar = async (msg: string) => {
                    await atualizarOS({ nfe_status: 'erro_autorizacao', nfe_mensagem_erro: msg, nfe_tipo: 'contora' })
                    return json({ ok: false, erro: msg, os: { nfe_status: 'erro_autorizacao', nfe_mensagem_erro: msg } })
                }

                const rascunho = await contora(t, '/nfse/drafts', {
                    method: 'POST',
                    headers: { ...hdr, 'Content-Type': 'application/json', 'Idempotency-Key': `os_${os.id}_${Date.now()}` },
                    body: JSON.stringify({
                        environment: cfg.contora_ambiente,
                        payload: { service: servico, ...(taker ? { taker } : {}), amounts: { service_amount: valor, net_amount: valor } },
                    }),
                })
                const novoId = rascunho.data?.data?.id
                if (!rascunho.ok || !novoId) return falhar(`Contora recusou o rascunho: ${rascunho.data?.message || `HTTP ${rascunho.status}`}`)

                const envio = await contora(t, `/nfse/drafts/${novoId}/dispatch`, {
                    method: 'POST',
                    headers: { ...hdr, 'Content-Type': 'application/json', 'Idempotency-Key': `disp_${novoId}` },
                    body: JSON.stringify({ action: 'submit' }),
                })
                if (!envio.ok) return falhar(`Contora recusou o envio: ${envio.data?.message || `HTTP ${envio.status}`}`)

                const campos = await atualizarOS({
                    nfe_status: 'processando_autorizacao', nfe_ref: `contora:${novoId}`, nfe_tipo: 'contora',
                    nfe_ambiente: cfg.contora_ambiente, nfe_mensagem_erro: null, nfe_numero: null,
                    nfe_pdf_url: null, nfe_url_pdf: null, nfe_chave: null,
                })
                return json({ ok: true, estado: 'processando', os: campos })
            }

            if (!docId) return json({ ok: false, erro: 'Esta nota não foi emitida pela Contora.' })

            const lerStatus = async () => (await contora(t, `/nfse/drafts/${docId}/status`, { headers: hdr })).data?.data || {}

            // --- Consultar ---
            if (acao === 'status') {
                const st = await lerStatus()
                const situacao = st.lifecycle?.status
                if (st.cancellation?.status === 'cancelled') {
                    return json({ ok: true, estado: 'cancelado', os: await atualizarOS({ nfe_status: 'cancelado', nfe_cancelada_em: st.cancellation.cancelled_at || new Date().toISOString() }) })
                }
                if (situacao === 'authorized') {
                    // Guarda o DANFSe num endereço público difícil de adivinhar (como a Focus faz)
                    let pdfUrl: string | null = null
                    const pdf = await fetch(`${CONTORA_API}/nfse/drafts/${docId}/artifacts/pdf_nfse`, { headers: { 'Authorization': `Bearer ${t}`, ...hdr } })
                    if (pdf.ok) {
                        const caminho = `nfse/${empresaId}/${st.access_key || docId}.pdf`
                        const up = await admin.storage.from('comprovantes').upload(caminho, new Uint8Array(await pdf.arrayBuffer()), { contentType: 'application/pdf', upsert: true })
                        if (!up.error) pdfUrl = admin.storage.from('comprovantes').getPublicUrl(caminho).data.publicUrl
                    }
                    return json({ ok: true, estado: 'autorizado', os: await atualizarOS({
                        nfe_status: 'autorizado', nfe_numero: String(st.nfse_number || ''), nfe_chave: st.access_key || null,
                        nfe_emitida_em: new Date().toISOString(), nfe_pdf_url: pdfUrl, nfe_url_pdf: pdfUrl, nfe_mensagem_erro: null,
                    }) })
                }
                if (situacao === 'error') {
                    const msg = st.last_error_message || st.last_error_code || 'Rejeitada pela prefeitura / Sistema Nacional'
                    return json({ ok: true, estado: 'erro', os: await atualizarOS({ nfe_status: 'erro_autorizacao', nfe_mensagem_erro: msg }) })
                }
                return json({ ok: true, estado: 'processando', os: {} })
            }

            // --- Cancelar ---
            const motivo = String(justificativa || '').trim()
            if (motivo.length < 15 || motivo.length > 255) return json({ ok: false, erro: 'A justificativa precisa ter entre 15 e 255 caracteres.' })
            const pedido = await contora(t, `/nfse/drafts/${docId}/cancel`, {
                method: 'POST',
                headers: { ...hdr, 'Content-Type': 'application/json', 'Idempotency-Key': `cancel_${docId}` },
                body: JSON.stringify({ reason: motivo }),
            })
            if (!pedido.ok) return json({ ok: false, erro: `Contora recusou o cancelamento: ${pedido.data?.message || `HTTP ${pedido.status}`}` })
            for (let i = 0; i < 6; i++) {
                await new Promise(r => setTimeout(r, 3000))
                const c = (await lerStatus()).cancellation || {}
                if (c.status === 'cancelled') {
                    return json({ ok: true, estado: 'cancelado', os: await atualizarOS({
                        nfe_status: 'cancelado', nfe_cancelada_em: c.cancelled_at || new Date().toISOString(), nfe_justificativa_cancelamento: motivo,
                    }) })
                }
                if (['rejected', 'error', 'failed'].includes(c.status)) {
                    return json({ ok: false, erro: `Cancelamento recusado: ${c.status_message || c.status_code || c.status}` })
                }
            }
            return json({ ok: true, estado: 'processando_cancelamento', os: await atualizarOS({ nfe_status: 'processando_cancelamento', nfe_justificativa_cancelamento: motivo }) })
        }

        if (ehTecnico) return json({ ok: false, erro: 'Somente o administrador pode alterar a nota fiscal' }, 403)

        if (acao === 'salvar_token') {
            const t = String(token || '').trim()
            if (!/^fct_[A-Za-z0-9]{20,}$/.test(t)) {
                return json({ ok: false, erro: 'Token inválido. Ele começa com "fct_" e é criado em Chaves de API, no painel da Contora.' })
            }
            // Confere na Contora antes de guardar
            const me = await contora(t, '/me')
            if (!me.ok) return json({ ok: false, erro: 'A Contora recusou este token. Confira se ele foi copiado inteiro e está ativo.' })

            const { error } = await admin.from('empresa_nfse_segredos')
                .upsert({ empresa_id: empresaId, contora_token: t, updated_at: new Date().toISOString() })
            if (error) return json({ ok: false, erro: `Não foi possível guardar o token: ${error.message}` })
            return json({ ok: true, token_definido: true })
        }

        if (acao === 'remover_token') {
            await admin.from('empresa_nfse_segredos').delete().eq('empresa_id', empresaId)
            return json({ ok: true, token_definido: false })
        }

        if (acao === 'testar') {
            const t = await lerToken()
            if (!t) return json({ ok: false, erro: 'Cole e salve o token da Contora primeiro.' })

            const lista = await contora(t, '/companies?per_page=50')
            if (!lista.ok) return json({ ok: false, erro: 'Não foi possível consultar a Contora com o token salvo.' })

            const empresas = (lista.data?.data || []).map(resumoEmpresa)
            if (empresas.length === 0) {
                return json({ ok: true, empresas, selecionada: null, pronta: false,
                    pendencias: ['Nenhuma empresa cadastrada na Contora. Cadastre a empresa e o certificado A1 no painel da Contora.'] })
            }

            // Empresa escolhida: a informada, ou a única da conta
            const alvo = soDigitos(cnpj)
            const selecionada = empresas.find((e: any) => soDigitos(e.cnpj) === alvo) || (empresas.length === 1 ? empresas[0] : null)
            if (!selecionada) return json({ ok: true, empresas, selecionada: null, pronta: false, pendencias: [] })

            const saude = await contora(t, `/companies/${selecionada.id}/nfse/health`)
            const health = saude.data?.data?.health || {}
            return json({
                ok: true,
                empresas,
                selecionada,
                pronta: !!health.ready,
                pendencias: health.blocks || [],
                avisos: health.warnings || [],
            })
        }

        return json({ ok: false, erro: 'Ação desconhecida' }, 400)
    } catch (e: any) {
        return json({ ok: false, erro: e?.message || 'Erro inesperado' }, 500)
    }
})
