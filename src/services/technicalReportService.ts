import { supabase } from '@/lib/supabase'
import { DadosRelatorio, EmpresaSnapshot, RelatorioTecnico, relatorioVazio } from '@/types/technicalReport'

// A tabela ainda não está nos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase as any).from('relatorios_tecnicos')

const limpar = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// Extrai a metragem dos itens da OS ("... | 22,00m | ..." ou qtd de item cobrado por metro)
function extensaoDosItens(itens: any): string {
    if (!Array.isArray(itens)) return ''
    let total = 0
    for (const item of itens) {
        const texto = String(item?.descricao || item?.nome || '')
        const m = texto.match(/\|\s*([\d.,]+)\s*m\s*\|/i)
        const porMetro = /\/m\b/i.test(texto) || /\bm(etro|etros)?\b/i.test(String(item?.unidade || ''))
        if (m) total += Number(m[1].replace(/\./g, '').replace(',', '.')) || 0
        else if (porMetro && Number(item?.qtd) > 1) total += Number(item.qtd) || 0
    }
    // "1,00m" costuma ser o valor cobrado por serviço, não metragem real
    if (total <= 1) return ''
    return String(Math.round(total * 100) / 100).replace('.', ',')
}

export const technicalReportService = {
    async buscar(id: string): Promise<RelatorioTecnico | null> {
        const { data, error } = await tabela().select('*').eq('id', id).maybeSingle()
        if (error) throw error
        return data
    },

    async buscarPorOS(osId: string): Promise<RelatorioTecnico | null> {
        const { data, error } = await tabela().select('*').eq('ordem_servico_id', osId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (error) throw error
        return data
    },

    /** Monta um rascunho a partir da OS, com tudo que o sistema já sabe. Nada é gravado aqui. */
    async montarRascunhoDaOS(osId: string): Promise<{ dados: DadosRelatorio, marcaId: string | null }> {
        const { data: os, error } = await (supabase.from('ordens_servico') as any)
            .select('*, clientes:cliente_id (*)')
            .eq('id', osId)
            .single()
        if (error) throw error

        const dados = relatorioVazio()
        const c = os.clientes || {}

        const endereco = limpar(c.endereco) ||
            [limpar(c.logradouro), limpar(c.numero), limpar(c.complemento)].filter(Boolean).join(', ')
        dados.cliente.nome = limpar(c.nome_razao) || limpar(c.nome) || limpar(os.cliente_nome)
        dados.cliente.documento = limpar(c.cpf_cnpj) || limpar(c.documento)
        dados.cliente.endereco = endereco
        dados.cliente.bairro = limpar(c.bairro)
        dados.cliente.cidade_uf = [limpar(c.cidade), limpar(c.uf)].filter(Boolean).join(' / ')
        dados.cliente.contato_nome = dados.cliente.nome
        dados.cliente.contato_telefone = limpar(c.whatsapp) || limpar(c.telefone) || limpar(os.cliente_whatsapp)

        const dataServico = os.data_agendamento || os.created_at
        if (dataServico) {
            // Datas sem hora ficam gravadas à meia-noite UTC; convertê-las para o fuso local voltaria um dia
            if (/T00:00:00(\.0+)?(\+00:00|Z)?$/.test(String(dataServico))) dados.atendimento.data = String(dataServico).slice(0, 10)
            else {
                const d = new Date(dataServico)
                dados.atendimento.data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            }
        }
        if (os.deslocamento_iniciado_em) {
            const d = new Date(os.previsao_chegada || os.deslocamento_iniciado_em)
            dados.atendimento.chegada = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }

        if (os.tecnico_id) {
            const { data: tec } = await (supabase.from('usuarios') as any)
                .select('id, nome_completo, nome, signature_url, assinatura_url')
                .eq('id', os.tecnico_id)
                .maybeSingle()
            if (tec) {
                dados.atendimento.tecnico_id = tec.id
                dados.atendimento.tecnico_nome = limpar(tec.nome_completo) || limpar(tec.nome)
                dados.assinaturas.tecnico_nome = dados.atendimento.tecnico_nome
                dados.assinaturas.tecnico_assinatura_url = limpar(tec.signature_url) || limpar(tec.assinatura_url)
            }
        }

        // Descrição e observações da OS entram como ponto de partida das anotações do técnico
        const descricao = limpar(os.descricao_servico) || limpar(os.descricao)
        const obs = limpar(os.observacoes)
            .split('\n')
            .filter(l => !/^\[\d{2}\/\d{2}\/\d{4}\] Limpeza de duplicatas/.test(l.trim()))
            .join('\n')
            .replace(/\s*-?\s*Tipo:\s*(Recibo|Orçamento|Servi[cç]o)\s*/gi, ' ')
            .trim()
        dados.diagnostico.anotacoes_tecnico = [descricao, obs].filter(Boolean).join('\n')
        dados.servico.extensao_m = extensaoDosItens(os.itens)

        dados.assinaturas.cliente_nome = dados.cliente.nome
        dados.assinaturas.cliente_cpf = dados.cliente.documento
        dados.assinaturas.cliente_assinatura_url = limpar(os.assinatura_cliente_url)
        dados.assinaturas.local_data = [c.cidade ? limpar(c.cidade) : '', dados.atendimento.data ? new Date(dados.atendimento.data + 'T12:00:00').toLocaleDateString('pt-BR') : '']
            .filter(Boolean).join(', ')

        // Fotos já registradas na OS
        const fotosOS = os.fotos || {}
        for (const momento of ['antes', 'depois'] as const) {
            for (const url of (fotosOS[momento] || []) as string[]) {
                if (url) dados.fotos.push({ url, legenda: '', momento, data_hora: os.updated_at || os.created_at })
            }
        }

        return { dados, marcaId: os.marca_id || null }
    },

    async criar(params: { empresaId: string, marcaId: string | null, osId: string | null, dados: DadosRelatorio }): Promise<RelatorioTecnico> {
        const { data, error } = await tabela()
            .insert({
                empresa_id: params.empresaId,
                marca_id: params.marcaId,
                ordem_servico_id: params.osId,
                dados: params.dados
            })
            .select('*')
            .single()
        if (error) throw error
        return data
    },

    async salvar(id: string, dados: DadosRelatorio, marcaId: string | null): Promise<RelatorioTecnico> {
        const { data, error } = await tabela()
            .update({ dados, marca_id: marcaId })
            .eq('id', id)
            .eq('status', 'rascunho') // relatório emitido não é alterado por aqui
            .select('*')
            .single()
        if (error) throw error
        return data
    },

    /** Congela os dados da empresa/marca dentro do relatório e marca como emitido. */
    async emitir(id: string, dados: DadosRelatorio, marcaId: string | null, empresaId: string): Promise<RelatorioTecnico> {
        const empresa = await this.buscarEmpresa(marcaId, empresaId)
        const { data, error } = await tabela()
            .update({ dados: { ...dados, empresa }, marca_id: marcaId, status: 'emitido', emitido_em: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single()
        if (error) throw error
        return data
    },

    async reabrir(id: string): Promise<RelatorioTecnico> {
        const { data, error } = await tabela()
            .update({ status: 'rascunho', emitido_em: null })
            .eq('id', id)
            .select('*')
            .single()
        if (error) throw error
        return data
    },

    async buscarEmpresa(marcaId: string | null, empresaId: string): Promise<EmpresaSnapshot> {
        if (marcaId) {
            const { data: m } = await (supabase as any).from('empresas_marcas').select('*').eq('id', marcaId).maybeSingle()
            if (m) {
                const endereco = [
                    limpar(m.endereco), limpar(m.numero) && !limpar(m.endereco).includes(limpar(m.numero)) ? limpar(m.numero) : '',
                    limpar(m.complemento), limpar(m.bairro),
                    [limpar(m.cidade), limpar(m.estado)].filter(Boolean).join(' - '), limpar(m.cep) ? `CEP ${limpar(m.cep)}` : ''
                ].filter(Boolean).join(', ')
                return {
                    nome: limpar(m.nome), razao_social: limpar(m.razao_social), cnpj: limpar(m.cnpj),
                    telefone: limpar(m.telefone), email: limpar(m.email_contato), endereco,
                    logo_url: limpar(m.logo_url), cor_tema: limpar(m.cor_tema)
                }
            }
        }
        const { data: e } = await (supabase.from('empresas') as any).select('*').eq('id', empresaId).maybeSingle()
        return {
            nome: limpar(e?.nome_fantasia) || limpar(e?.nome), razao_social: limpar(e?.razao_social) || limpar(e?.nome),
            cnpj: limpar(e?.cnpj), telefone: limpar(e?.telefone), email: limpar(e?.email),
            endereco: limpar(e?.endereco), logo_url: limpar(e?.logo_url), cor_tema: ''
        }
    },

    async enviarFoto(arquivo: File, empresaId: string): Promise<string> {
        const comprimida = await comprimirImagem(arquivo)
        const nome = `relatorios/${empresaId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`
        const { error } = await supabase.storage.from('avatars').upload(nome, comprimida, { contentType: 'image/jpeg' })
        if (error) throw error
        return supabase.storage.from('avatars').getPublicUrl(nome).data.publicUrl
    },

    async gerarTextosIA(dados: DadosRelatorio): Promise<{
        relato_cliente: string, constatacoes: string, verificacao: string,
        recomendacoes_outras: string, limitacoes: string, legendas: string[]
    }> {
        const { data, error } = await supabase.functions.invoke('gerar-relatorio-tecnico', { body: { dados } })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        return data
    }
}

// Reduz a foto para no máximo 1600px (boa qualidade no A4, arquivo leve)
async function comprimirImagem(arquivo: File, lado = 1600, qualidade = 0.82): Promise<Blob> {
    const url = URL.createObjectURL(arquivo)
    try {
        const img = await new Promise<HTMLImageElement>((ok, erro) => {
            const i = new Image()
            i.onload = () => ok(i)
            i.onerror = erro
            i.src = url
        })
        const escala = Math.min(1, lado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        return await new Promise<Blob>((ok, erro) => canvas.toBlob(b => (b ? ok(b) : erro(new Error('Falha ao comprimir'))), 'image/jpeg', qualidade))
    } finally {
        URL.revokeObjectURL(url)
    }
}
