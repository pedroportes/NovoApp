// Relatório Técnico de Serviço (laudo entregue ao cliente)
// Os dados ficam em relatorios_tecnicos.dados (jsonb). As opções abaixo seguem o modelo aprovado pelo Pedro.

export type StatusRelatorio = 'rascunho' | 'emitido'
export type MomentoFoto = 'antes' | 'durante' | 'depois' | 'videoinspecao'

export interface FotoRelatorio {
    url: string
    legenda: string
    momento: MomentoFoto
    data_hora: string // ISO
}

export interface EmpresaSnapshot {
    nome: string
    razao_social: string
    cnpj: string
    telefone: string
    email: string
    endereco: string
    logo_url: string
    cor_tema: string
}

export interface DadosRelatorio {
    versao: 1
    empresa?: EmpresaSnapshot // congelado na emissão
    cliente: {
        nome: string
        documento: string
        endereco: string
        bairro: string
        cidade_uf: string
        contato_nome: string
        contato_telefone: string
        tipo_imovel: string
        tipo_imovel_outro: string
    }
    atendimento: {
        data: string // AAAA-MM-DD
        chegada: string // HH:MM
        saida: string // HH:MM
        tecnico_id: string
        tecnico_nome: string
        tipo: string
        relato_cliente: string
    }
    diagnostico: {
        pontos: string[]
        ponto_outro: string
        causas: string[]
        causa_outra: string
        anotacoes_tecnico: string // rascunho livre do técnico (não sai no documento)
        constatacoes: string // texto formal que sai no documento
    }
    servico: {
        metodos: string[]
        metodo_outro: string
        equipamentos: string
        extensao_m: string
        duracao: string
    }
    videoinspecao: {
        realizada: boolean | null
        trecho: string
        extensao_m: string
        registro: string
        condicoes: string[]
        condicao_outra: string
    }
    resultado: {
        situacao: string
        verificacao: string
    }
    recomendacoes: {
        marcadas: string[]
        outras: string
    }
    limitacoes: string
    garantia: string
    assinaturas: {
        tecnico_nome: string
        tecnico_documento: string
        tecnico_assinatura_url: string
        cliente_nome: string
        cliente_cpf: string
        cliente_assinatura_url: string
        local_data: string
    }
    fotos: FotoRelatorio[]
    ia?: {
        gerado_em: string
        campos: string[] // campos preenchidos pela IA e ainda não revisados
    }
}

export interface RelatorioTecnico {
    id: string
    empresa_id: string
    marca_id: string | null
    ordem_servico_id: string | null
    numero: number
    status: StatusRelatorio
    dados: DadosRelatorio
    created_at: string
    updated_at: string
    emitido_em: string | null
}

export const OPCOES = {
    tipoImovel: ['Residencial', 'Comercial', 'Condominial', 'Industrial', 'Outro'],
    tipoAtendimento: ['Emergencial', 'Agendado', 'Preventivo', 'Retorno'],
    pontos: [
        'Pia de cozinha', 'Lavatório', 'Vaso sanitário', 'Ralo', 'Tanque / máquina de lavar', 'Caixa de gordura',
        'Caixa de inspeção', 'Ramal / coletor', 'Coluna / prumada', 'Calha / águas pluviais', 'Fossa / sumidouro', 'Outro'
    ],
    causas: [
        'Gordura / óleo', 'Resíduos sólidos', 'Raízes', 'Sedimentos (areia, argamassa)', 'Objeto estranho',
        'Tubulação danificada / deformada', 'Falta de caimento', 'Ventilação deficiente', 'Outra'
    ],
    metodos: [
        'Sonda / arame manual', 'Máquina rotativa (cabo de aço)', 'Hidrojateamento', 'Sucção', 'Videoinspeção', 'Outro método'
    ],
    condicoesVideo: [
        'Sem anomalias', 'Obstrução parcial', 'Obstrução total', 'Presença de raízes', 'Fissura / trinca',
        'Deformação', 'Desalinhamento', 'Acúmulo de sedimentos', 'Outra'
    ],
    situacaoFinal: ['Fluxo normalizado', 'Normalizado parcialmente', 'Não normalizado'],
    recomendacoes: [
        'Limpeza periódica da caixa de gordura', 'Evitar descarte de gordura e resíduos sólidos',
        'Avaliar reparo ou substituição de trecho', 'Nova inspeção por vídeo',
        'Tratar / remover raízes', 'Manutenção preventiva programada'
    ],
    momentosFoto: [
        { valor: 'antes', rotulo: 'Antes' },
        { valor: 'durante', rotulo: 'Durante' },
        { valor: 'depois', rotulo: 'Depois' },
        { valor: 'videoinspecao', rotulo: 'Videoinspeção' }
    ] as { valor: MomentoFoto, rotulo: string }[]
}

export const NOTA_DE_ESCOPO =
    'Este relatório registra o serviço executado e as condições observadas no momento do atendimento. ' +
    'Não constitui laudo pericial e não substitui documento técnico emitido por profissional habilitado no Sistema Confea/Crea, quando exigido.'

export const DECLARACAO_CLIENTE =
    'O cliente ou responsável presente declara ter acompanhado o atendimento e recebido as informações constantes deste relatório, ' +
    'que descreve o serviço executado e as condições observadas no momento da visita.'

export function relatorioVazio(): DadosRelatorio {
    return {
        versao: 1,
        cliente: { nome: '', documento: '', endereco: '', bairro: '', cidade_uf: '', contato_nome: '', contato_telefone: '', tipo_imovel: '', tipo_imovel_outro: '' },
        atendimento: { data: '', chegada: '', saida: '', tecnico_id: '', tecnico_nome: '', tipo: '', relato_cliente: '' },
        diagnostico: { pontos: [], ponto_outro: '', causas: [], causa_outra: '', anotacoes_tecnico: '', constatacoes: '' },
        servico: { metodos: [], metodo_outro: '', equipamentos: '', extensao_m: '', duracao: '' },
        videoinspecao: { realizada: null, trecho: '', extensao_m: '', registro: '', condicoes: [], condicao_outra: '' },
        resultado: { situacao: '', verificacao: '' },
        recomendacoes: { marcadas: [], outras: '' },
        limitacoes: '',
        garantia: '',
        assinaturas: { tecnico_nome: '', tecnico_documento: '', tecnico_assinatura_url: '', cliente_nome: '', cliente_cpf: '', cliente_assinatura_url: '', local_data: '' },
        fotos: []
    }
}

export function numeroFormatado(numero: number | null | undefined, criadoEm?: string | null): string {
    if (!numero) return 'RASCUNHO'
    const ano = criadoEm ? new Date(criadoEm).getFullYear() : new Date().getFullYear()
    return `RT-${ano}-${String(numero).padStart(4, '0')}`
}
