import { useEffect, ReactNode } from 'react'
import {
    DadosRelatorio, EmpresaSnapshot, StatusRelatorio, OPCOES,
    NOTA_DE_ESCOPO, DECLARACAO_CLIENTE, numeroFormatado
} from '@/types/technicalReport'

interface Props {
    dados: DadosRelatorio
    empresa: EmpresaSnapshot | null
    numero: number | null
    status: StatusRelatorio
    criadoEm?: string | null
    emitidoEm?: string | null
}

const FONTES_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap'

function useFontes() {
    useEffect(() => {
        if (document.querySelector(`link[href="${FONTES_URL}"]`)) return
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = FONTES_URL
        document.head.appendChild(link)
    }, [])
}

const dataBR = (iso?: string | null) => {
    if (!iso) return ''
    const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso)
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}
const dataHoraBR = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '' : `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

// Junta as opções marcadas, trocando "Outro/Outra" pelo texto informado
const comOutro = (marcados: string[], outro: string, rotuloOutro: string) =>
    marcados.flatMap(m => (m === rotuloOutro ? (outro.trim() ? [outro.trim()] : []) : [m]))

function Campo({ rotulo, valor, largo }: { rotulo: string, valor?: string, largo?: boolean }) {
    return (
        <div className={largo ? 'rt-campo rt-largo' : 'rt-campo'}>
            <div className="rt-rotulo">{rotulo}</div>
            <div className="rt-valor">{valor && valor.trim() ? valor : '—'}</div>
        </div>
    )
}

function Marcados({ itens }: { itens: string[] }) {
    return (
        <div className="rt-marcados">
            {itens.map(i => (
                <span key={i} className="rt-marcado">
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {i}
                </span>
            ))}
        </div>
    )
}

function Texto({ rotulo, texto }: { rotulo: string, texto: string }) {
    if (!texto.trim()) return null
    return (
        <div className="rt-bloco-texto">
            <div className="rt-rotulo">{rotulo}</div>
            <div className="rt-paragrafos">
                {texto.trim().split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
        </div>
    )
}

export function TechnicalReportDocument({ dados, empresa, numero, status, criadoEm, emitidoEm }: Props) {
    useFontes()
    const e = dados.empresa || empresa
    const cor = e?.cor_tema || '#2bb3c0'
    const numeroTexto = numeroFormatado(numero, criadoEm)
    const dataEmissao = dataBR(emitidoEm) || (status === 'rascunho' ? 'Não emitido' : '')

    const pontos = comOutro(dados.diagnostico.pontos, dados.diagnostico.ponto_outro, 'Outro')
    const causas = comOutro(dados.diagnostico.causas, dados.diagnostico.causa_outra, 'Outra')
    const metodos = comOutro(dados.servico.metodos, dados.servico.metodo_outro, 'Outro método')
    const condicoes = comOutro(dados.videoinspecao.condicoes, dados.videoinspecao.condicao_outra, 'Outra')
    const tipoImovel = dados.cliente.tipo_imovel === 'Outro' ? dados.cliente.tipo_imovel_outro : dados.cliente.tipo_imovel
    const fotos = [...dados.fotos].sort((a, b) =>
        OPCOES.momentosFoto.findIndex(m => m.valor === a.momento) - OPCOES.momentosFoto.findIndex(m => m.valor === b.momento))
    const rotuloMomento = (m: string) => OPCOES.momentosFoto.find(x => x.valor === m)?.rotulo || ''

    // Seções numeradas na ordem em que aparecem (as vazias somem e a numeração se ajusta)
    const secoes: { titulo: string, conteudo: ReactNode, quebraAntes?: boolean }[] = []

    secoes.push({
        titulo: 'Identificação da empresa prestadora',
        conteudo: (
            <div className="rt-grade">
                <Campo rotulo="Razão social" valor={e?.razao_social || e?.nome} largo />
                <Campo rotulo="Nome fantasia" valor={e?.nome} />
                <Campo rotulo="CNPJ" valor={e?.cnpj} />
                <Campo rotulo="Telefone / WhatsApp" valor={e?.telefone} />
                {e?.email ? <Campo rotulo="E-mail" valor={e.email} /> : null}
                <Campo rotulo="Endereço" valor={e?.endereco} largo />
            </div>
        )
    })

    secoes.push({
        titulo: 'Cliente e local do atendimento',
        conteudo: (
            <div className="rt-grade">
                <Campo rotulo="Cliente / Razão social" valor={dados.cliente.nome} largo />
                <Campo rotulo="CPF / CNPJ" valor={dados.cliente.documento} />
                <Campo rotulo="Tipo de imóvel" valor={tipoImovel} />
                <Campo rotulo="Endereço do atendimento" valor={dados.cliente.endereco} largo />
                <Campo rotulo="Bairro" valor={dados.cliente.bairro} />
                <Campo rotulo="Cidade / UF" valor={dados.cliente.cidade_uf} />
                {dados.cliente.contato_nome && dados.cliente.contato_nome !== dados.cliente.nome
                    ? <Campo rotulo="Contato no local" valor={dados.cliente.contato_nome} /> : null}
                {dados.cliente.contato_telefone ? <Campo rotulo="Telefone do contato" valor={dados.cliente.contato_telefone} /> : null}
            </div>
        )
    })

    secoes.push({
        titulo: 'Dados do atendimento',
        conteudo: (
            <>
                <div className="rt-grade rt-grade-4">
                    <Campo rotulo="Data" valor={dataBR(dados.atendimento.data)} />
                    <Campo rotulo="Chegada" valor={dados.atendimento.chegada} />
                    <Campo rotulo="Saída" valor={dados.atendimento.saida} />
                    <Campo rotulo="Tipo de atendimento" valor={dados.atendimento.tipo} />
                    <Campo rotulo="Técnico responsável" valor={dados.atendimento.tecnico_nome} largo />
                </div>
                <Texto rotulo="Motivo do chamado · relato do cliente" texto={dados.atendimento.relato_cliente} />
            </>
        )
    })

    if (pontos.length || causas.length || dados.diagnostico.constatacoes.trim()) {
        secoes.push({
            titulo: 'Diagnóstico técnico',
            conteudo: (
                <>
                    {pontos.length ? <div className="rt-subbloco"><div className="rt-rotulo">Ponto(s) afetado(s)</div><Marcados itens={pontos} /></div> : null}
                    {causas.length ? <div className="rt-subbloco"><div className="rt-rotulo">Causa provável</div><Marcados itens={causas} /></div> : null}
                    <Texto rotulo="Constatações técnicas" texto={dados.diagnostico.constatacoes} />
                </>
            )
        })
    }

    if (metodos.length || dados.servico.equipamentos || dados.servico.extensao_m || dados.servico.duracao) {
        secoes.push({
            titulo: 'Serviço executado',
            conteudo: (
                <>
                    {metodos.length ? <div className="rt-subbloco"><div className="rt-rotulo">Método(s) empregado(s)</div><Marcados itens={metodos} /></div> : null}
                    <div className="rt-grade rt-grade-3">
                        {dados.servico.equipamentos ? <Campo rotulo="Equipamentos utilizados" valor={dados.servico.equipamentos} /> : null}
                        {dados.servico.extensao_m ? <Campo rotulo="Extensão alcançada" valor={`${dados.servico.extensao_m} m`} /> : null}
                        {dados.servico.duracao ? <Campo rotulo="Duração" valor={dados.servico.duracao} /> : null}
                    </div>
                </>
            )
        })
    }

    if (dados.videoinspecao.realizada) {
        secoes.push({
            titulo: 'Videoinspeção',
            conteudo: (
                <>
                    <div className="rt-grade rt-grade-3">
                        <Campo rotulo="Trecho inspecionado" valor={dados.videoinspecao.trecho} />
                        <Campo rotulo="Extensão inspecionada" valor={dados.videoinspecao.extensao_m ? `${dados.videoinspecao.extensao_m} m` : ''} />
                        <Campo rotulo="Registro / nº do arquivo" valor={dados.videoinspecao.registro} />
                    </div>
                    {condicoes.length ? <div className="rt-subbloco"><div className="rt-rotulo">Condição observada</div><Marcados itens={condicoes} /></div> : null}
                </>
            )
        })
    }

    if (dados.resultado.situacao || dados.resultado.verificacao.trim()) {
        const tom = dados.resultado.situacao === 'Fluxo normalizado' ? 'ok' : dados.resultado.situacao === 'Não normalizado' ? 'ruim' : 'parcial'
        secoes.push({
            titulo: 'Resultado do serviço',
            conteudo: (
                <>
                    {dados.resultado.situacao ? (
                        <div className="rt-subbloco">
                            <div className="rt-rotulo">Situação ao término</div>
                            <span className={`rt-situacao rt-situacao-${tom}`}>{dados.resultado.situacao}</span>
                        </div>
                    ) : null}
                    <Texto rotulo="Verificação realizada" texto={dados.resultado.verificacao} />
                </>
            )
        })
    }

    if (dados.recomendacoes.marcadas.length || dados.recomendacoes.outras.trim()) {
        secoes.push({
            titulo: 'Recomendações ao cliente',
            conteudo: (
                <>
                    {dados.recomendacoes.marcadas.length ? (
                        <ul className="rt-lista">
                            {dados.recomendacoes.marcadas.map(r => <li key={r}>{r}</li>)}
                        </ul>
                    ) : null}
                    <Texto rotulo={dados.recomendacoes.marcadas.length ? 'Outras recomendações' : 'Recomendações'} texto={dados.recomendacoes.outras} />
                </>
            )
        })
    }

    if (dados.limitacoes.trim()) {
        secoes.push({ titulo: 'Limitações e observações', conteudo: <Texto rotulo="Trechos não acessados, restrições e pontos fora do escopo" texto={dados.limitacoes} /> })
    }

    if (dados.garantia.trim()) {
        secoes.push({ titulo: 'Garantia', conteudo: <Texto rotulo="Prazo e condições" texto={dados.garantia} /> })
    }

    secoes.push({
        titulo: 'Declaração e assinaturas',
        conteudo: (
            <>
                <p className="rt-declaracao">{DECLARACAO_CLIENTE}</p>
                <div className="rt-assinaturas">
                    <div className="rt-assinatura">
                        <div className="rt-assinatura-img">
                            {dados.assinaturas.tecnico_assinatura_url ? <img src={dados.assinaturas.tecnico_assinatura_url} alt="" crossOrigin="anonymous" /> : null}
                        </div>
                        <div className="rt-assinatura-linha" />
                        <div className="rt-assinatura-nome">{dados.assinaturas.tecnico_nome || 'Técnico responsável'}</div>
                        <div className="rt-assinatura-info">
                            Técnico responsável{dados.assinaturas.tecnico_documento ? ` · ${dados.assinaturas.tecnico_documento}` : ''}
                        </div>
                    </div>
                    <div className="rt-assinatura">
                        <div className="rt-assinatura-img">
                            {dados.assinaturas.cliente_assinatura_url ? <img src={dados.assinaturas.cliente_assinatura_url} alt="" crossOrigin="anonymous" /> : null}
                        </div>
                        <div className="rt-assinatura-linha" />
                        <div className="rt-assinatura-nome">{dados.assinaturas.cliente_nome || 'Cliente / responsável no local'}</div>
                        <div className="rt-assinatura-info">
                            Cliente / responsável no local{dados.assinaturas.cliente_cpf ? ` · CPF/CNPJ ${dados.assinaturas.cliente_cpf}` : ''}
                        </div>
                    </div>
                </div>
                {dados.assinaturas.local_data ? <div className="rt-local-data">{dados.assinaturas.local_data}</div> : null}
                <div className="rt-nota-escopo">
                    <strong>Nota de escopo.</strong> {NOTA_DE_ESCOPO}
                </div>
            </>
        )
    })

    if (fotos.length) {
        secoes.push({
            titulo: 'Anexo · Registro fotográfico',
            quebraAntes: true,
            conteudo: (
                <div className="rt-fotos">
                    {fotos.map((f, i) => (
                        <figure key={f.url + i} className="rt-foto">
                            <div className="rt-foto-img"><img src={f.url} alt={f.legenda || `Imagem ${i + 1}`} crossOrigin="anonymous" /></div>
                            <figcaption>
                                <span className="rt-foto-num">Imagem {i + 1}{f.momento ? ` · ${rotuloMomento(f.momento)}` : ''}</span>
                                {f.legenda ? <span className="rt-foto-legenda">{f.legenda}</span> : null}
                                {f.data_hora ? <span className="rt-foto-data">{dataHoraBR(f.data_hora)}</span> : null}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )
        })
    }

    return (
        <div className="rt-doc" style={{ ['--rt-acento' as any]: cor }}>
            <style>{CSS}</style>
            {status === 'rascunho' ? <div className="rt-marca-dagua" aria-hidden="true">RASCUNHO</div> : null}

            <header className="rt-cabecalho">
                <div className="rt-cabecalho-esq">
                    {e?.logo_url ? <div className="rt-logo"><img src={e.logo_url} alt={e.nome} crossOrigin="anonymous" /></div> : null}
                    <div>
                        <div className="rt-sobretitulo"><span className="rt-traco" />Documento técnico</div>
                        <h1>Relatório Técnico de Serviço</h1>
                        <div className="rt-subtitulo">Desentupimento e inspeção de redes hidrossanitárias</div>
                    </div>
                </div>
                <div className="rt-cabecalho-dir">
                    <div className="rt-meta"><div className="rt-meta-rotulo">Nº do relatório</div><div className="rt-meta-valor">{numeroTexto}</div></div>
                    <div className="rt-meta"><div className="rt-meta-rotulo">Data de emissão</div><div className="rt-meta-valor">{dataEmissao}</div></div>
                </div>
            </header>

            {secoes.map((s, i) => (
                <section key={s.titulo} className={s.quebraAntes ? 'rt-secao rt-quebra-antes' : 'rt-secao'}>
                    <h2><span className="rt-num">{i + 1}</span>{s.titulo}</h2>
                    {s.conteudo}
                </section>
            ))}

            <footer className="rt-rodape-tela">
                Relatório Técnico de Serviço · {numeroTexto}{e?.nome ? ` · ${e.nome}` : ''}
            </footer>
        </div>
    )
}

const CSS = `
.rt-doc {
  --rt-azul: #0f2a47;
  --rt-azul-2: #16395f;
  --rt-texto: #1e293b;
  --rt-cinza: #64748b;
  --rt-linha: #e2e8f0;
  --rt-fundo-campo: #f5f7fa;
  position: relative;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 0 0 12mm;
  background: #fff;
  color: var(--rt-texto);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 9.5pt;
  line-height: 1.5;
  box-shadow: 0 10px 40px rgba(15, 42, 71, .15);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  overflow: hidden;
}
.rt-doc * { box-sizing: border-box; }
.rt-marca-dagua {
  position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
  font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 96pt; letter-spacing: .1em;
  color: rgba(15, 42, 71, .06); pointer-events: none; z-index: 0; white-space: nowrap;
}
.rt-cabecalho {
  position: relative;
  display: flex; justify-content: space-between; align-items: center; gap: 10mm;
  padding: 12mm 14mm 11mm;
  background: var(--rt-azul);
  background-image: radial-gradient(circle at 92% -20%, rgba(255,255,255,.08) 0 28%, transparent 28.2%),
                    radial-gradient(circle at 92% -20%, rgba(255,255,255,.05) 0 40%, transparent 40.2%);
  color: #fff;
  border-bottom: 2.2mm solid var(--rt-acento);
}
.rt-cabecalho-esq { display: flex; align-items: center; gap: 6mm; min-width: 0; }
.rt-logo { flex: none; width: 22mm; height: 22mm; background: #fff; border-radius: 3mm; padding: 2mm; display: flex; align-items: center; justify-content: center; }
.rt-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.rt-sobretitulo { display: flex; align-items: center; gap: 3mm; font-size: 7.5pt; font-weight: 600; letter-spacing: .28em; text-transform: uppercase; color: #cbd5e1; }
.rt-traco { display: inline-block; width: 9mm; height: .8mm; background: var(--rt-acento); border-radius: 1mm; }
.rt-cabecalho h1 { margin: 2.5mm 0 1.5mm; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 18pt; line-height: 1.15; letter-spacing: -.01em; color: #fff; }
.rt-subtitulo { font-size: 10pt; color: #cbd5e1; }
.rt-cabecalho-dir { flex: none; display: flex; flex-direction: column; gap: 3mm; width: 52mm; }
.rt-meta-rotulo { font-size: 6.5pt; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: #cbd5e1; margin-bottom: 1mm; }
.rt-meta-valor { background: #fff; color: var(--rt-azul); font-weight: 700; font-size: 10pt; padding: 1.8mm 3mm; border-radius: 1mm; min-height: 8mm; }

.rt-secao { position: relative; z-index: 1; padding: 0 14mm; margin-top: 7mm; }
.rt-secao h2 {
  display: flex; align-items: center; gap: 3mm; margin: 0 0 3.5mm;
  font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 10pt; letter-spacing: .14em; text-transform: uppercase; color: var(--rt-azul);
  break-after: avoid; page-break-after: avoid;
}
.rt-secao h2::after { content: ''; flex: 1; height: .3mm; background: var(--rt-linha); }
.rt-num { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 7mm; height: 7mm; border-radius: 1.2mm; background: var(--rt-azul); color: #fff; font-size: 9pt; letter-spacing: 0; }

.rt-grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.5mm 4mm; }
.rt-grade-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rt-grade-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.rt-grade-3:empty { display: none; }
.rt-campo { min-width: 0; break-inside: avoid; }
.rt-largo { grid-column: span 2; }
.rt-grade-4 .rt-largo { grid-column: span 4; }
.rt-rotulo { font-size: 6.8pt; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--rt-cinza); margin-bottom: 1mm; }
.rt-valor { background: var(--rt-fundo-campo); border-bottom: .35mm solid #cfd8e3; padding: 1.8mm 2.5mm; font-weight: 500; min-height: 7.5mm; overflow-wrap: anywhere; }

.rt-subbloco { margin-bottom: 3.5mm; break-inside: avoid; }
.rt-marcados { display: flex; flex-wrap: wrap; gap: 1.8mm; }
.rt-marcado { display: inline-flex; align-items: center; gap: 1.5mm; padding: 1.2mm 2.8mm 1.2mm 2mm; border: .3mm solid #c7d2df; border-radius: 1.2mm; background: #f8fafc; font-weight: 500; }
.rt-marcado svg { width: 3.4mm; height: 3.4mm; color: #fff; background: var(--rt-azul); border-radius: .8mm; padding: .3mm; }

.rt-bloco-texto { margin-top: 3.5mm; }
.rt-bloco-texto p { margin: 0 0 2mm; text-align: justify; hyphens: auto; }
.rt-bloco-texto p:last-child { margin-bottom: 0; }
.rt-paragrafos { border-left: .8mm solid var(--rt-acento); padding-left: 3mm; }

.rt-situacao { display: inline-block; padding: 1.4mm 4mm; border-radius: 1.2mm; font-weight: 700; font-size: 9.5pt; }
.rt-situacao-ok { background: #e7f6ee; color: #146c43; border: .3mm solid #a6dcbf; }
.rt-situacao-parcial { background: #fff6e0; color: #8a5a00; border: .3mm solid #f1d38a; }
.rt-situacao-ruim { background: #fdecec; color: #a12626; border: .3mm solid #f0b4b4; }

.rt-lista { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.8mm 4mm; }
.rt-lista li { position: relative; padding-left: 5mm; break-inside: avoid; }
.rt-lista li::before { content: ''; position: absolute; left: 0; top: 1.4mm; width: 2.2mm; height: 2.2mm; border-radius: .5mm; background: var(--rt-acento); }

.rt-declaracao { margin: 0 0 4mm; color: #334155; text-align: justify; }
.rt-assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; break-inside: avoid; }
.rt-assinatura { text-align: center; }
.rt-assinatura-img { height: 18mm; display: flex; align-items: flex-end; justify-content: center; }
.rt-assinatura-img img { max-height: 18mm; max-width: 70mm; object-fit: contain; }
.rt-assinatura-linha { height: .3mm; background: #475569; margin: 1mm 0 1.5mm; }
.rt-assinatura-nome { font-weight: 700; }
.rt-assinatura-info { font-size: 7.5pt; color: var(--rt-cinza); }
.rt-local-data { margin-top: 4mm; text-align: center; color: #334155; }
.rt-nota-escopo { margin-top: 6mm; padding: 3mm 4mm; background: #f1f5f9; border-left: .8mm solid var(--rt-azul); font-size: 7.8pt; color: #475569; break-inside: avoid; }

.rt-fotos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5mm; }
.rt-foto { margin: 0; break-inside: avoid; page-break-inside: avoid; }
.rt-foto-img { height: 62mm; background: #f1f5f9; border: .3mm solid var(--rt-linha); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rt-foto-img img { width: 100%; height: 100%; object-fit: cover; }
.rt-foto figcaption { display: flex; flex-direction: column; gap: .5mm; padding-top: 1.8mm; }
.rt-foto-num { font-size: 6.8pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--rt-azul); }
.rt-foto-legenda { font-size: 8.5pt; }
.rt-foto-data { font-size: 7pt; color: var(--rt-cinza); }

.rt-rodape-tela { margin: 8mm 14mm 0; padding-top: 2.5mm; border-top: .3mm solid var(--rt-linha); font-size: 7pt; color: var(--rt-cinza); letter-spacing: .06em; }

@media print {
  @page { size: A4; margin: 12mm 0 14mm; @bottom-center { content: "Página " counter(page) " de " counter(pages); font-family: Inter, sans-serif; font-size: 7pt; color: #64748b; } }
  @page :first { margin-top: 0; }
  html, body { background: #fff !important; }
  .rt-doc { width: auto; min-height: 0; box-shadow: none; padding-bottom: 0; overflow: visible; }
  .rt-secao:first-of-type { margin-top: 7mm; }
  .rt-quebra-antes { break-before: page; page-break-before: always; margin-top: 0; }
  .rt-rodape-tela { display: none; }
  .rt-marca-dagua { position: fixed; }
}
`
