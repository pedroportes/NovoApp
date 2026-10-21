import type { PreviaNota } from '@/services/contoraNFSeService'

// PDF de conferência com o mesmo layout do DANFSe v2.0 que a Contora gera (padrão nacional),
// montado só no aparelho com os dados que serão enviados. Nada vai para a prefeitura:
// chave de acesso, número e QR Code só existem depois da emissão, e a página leva a marca
// "PRÉVIA – SEM VALOR FISCAL".

// Descrição oficial do código de tributação nacional (igual à do DANFSe)
const DESCRICAO_CODIGO: Record<string, string> = {
    '071001': 'Limpeza, manutenção e conservação de vias e logradouros públicos, parques, jardins e congêneres.',
}

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const ou = (t: unknown) => (String(t ?? '').trim() ? esc(t) : '-')
// A Contora tira os acentos da discriminação e das informações complementares
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const doc = (d: string) => d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d
const cep = (c: string) => c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c

const BORDA = 'border:1px solid #000'
const ROTULO = 'font-size:9px;font-weight:bold;line-height:1.25'
const VALOR = 'font-size:11px;line-height:1.3;overflow-wrap:anywhere'

interface Celula { r: string; v: string; span?: number }
// Uma seção = tabela com N colunas iguais; cada célula tem rótulo em negrito e valor embaixo
const tabela = (cols: number, linhas: Celula[][]) =>
    `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:-1px">
        <colgroup>${'<col/>'.repeat(cols)}</colgroup>
        ${linhas.map(l => `<tr>${l.map(c => `<td colspan="${c.span || 1}" style="${BORDA};padding:2px 5px 8px;vertical-align:top">
            <div style="${ROTULO}">${c.r}</div><div style="${VALOR}">${c.v}</div></td>`).join('')}</tr>`).join('')}
    </table>`
const titulo = (t: string) =>
    `<div style="${BORDA};margin-top:-1px;background:#d9d9d9;padding:3px 8px 7px;font-size:12px;font-weight:bold;line-height:1.25">${t}</div>`
const faixa = (t: string) =>
    `<div style="${BORDA};margin-top:-1px;padding:3px 8px 8px;font-size:11.5px;line-height:1.3">${t}</div>`
const celulaTopo = (r: string, v: string) =>
    `<td style="${BORDA};padding:2px 5px 8px;vertical-align:top"><div style="${ROTULO}">${r}</div><div style="${VALOR}">${v}</div></td>`

function montarHtml(p: PreviaNota, descricao: string): string {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const agora = new Date().toLocaleTimeString('pt-BR')
    const pr = p.prestador
    const tn = p.tomador_nota
    const municipioPrestador = (pr?.municipio || '').replace(' - ', ' / ')
    // "São José dos Pinhais/PR" ou "Mandirituba (sede)" → só o nome da cidade, como no DANFSe
    const cidadeLocal = p.local_prestacao.replace(/\s*\(sede\)\s*$/, '').replace(/\/[A-Z]{2}$/, '')

    return `
<div style="position:relative;width:794px;padding:26px 30px 30px;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box">
  <div style="position:absolute;top:470px;left:0;width:100%;text-align:center;transform:rotate(-32deg);font-size:70px;font-weight:bold;color:rgba(220,38,38,0.14);z-index:2;line-height:1">PRÉVIA – SEM VALOR FISCAL</div>

  <table style="width:100%;border-collapse:collapse;table-layout:fixed">
    <colgroup><col style="width:33%"/><col style="width:34%"/><col style="width:33%"/></colgroup>
    <tr>
      <td style="${BORDA};padding:6px 8px">
        <span style="font-size:40px;font-weight:900;letter-spacing:-2px;color:#2e7d32">NFS</span><span style="font-size:34px;font-weight:900;color:#1565c0">e</span>
        <span style="display:inline-block;vertical-align:middle;margin-left:6px;font-size:11px;color:#555;line-height:1.2">Nota Fiscal de<br/>Serviço Eletrônica</span></td>
      <td style="${BORDA};padding:6px;text-align:center">
        <div style="font-size:16px;font-weight:bold;line-height:1.3">DANFSe v2.0</div>
        <div style="font-size:13px;line-height:1.3">Documento Auxiliar da NFS-e</div></td>
      <td style="${BORDA};padding:6px 8px;font-size:11px;line-height:1.35">
        Município: ${ou(municipioPrestador)}<br/>Ambiente Gerador: Nacional<br/>Tipo de Ambiente: ${p.ambiente === 'producao' ? 'Produção' : 'Homologação'}</td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:-1px">
    <colgroup><col/><col/><col/><col style="width:25%"/></colgroup>
    <tr>
      <td colspan="3" style="${BORDA};padding:2px 5px 8px"><div style="${ROTULO}">CHAVE DE ACESSO DA NFS-E</div>
        <div style="${VALOR};color:#b91c1c;font-weight:bold">PRÉVIA – gerada só na emissão</div></td>
      <td rowspan="4" style="${BORDA};padding:6px;text-align:center;vertical-align:middle">
        <div style="margin:0 auto 6px;width:92px;height:92px;border:2px dashed #b91c1c;color:#b91c1c;font-size:13px;font-weight:bold;display:flex;align-items:center;justify-content:center;line-height:1.2">PRÉVIA<br/>sem QR</div>
        <div style="font-size:9px;line-height:1.3">A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e</div></td>
    </tr>
    <tr>${celulaTopo('NÚMERO DA NFS-E', '(na emissão)')}${celulaTopo('COMPETÊNCIA DA NFS-E', hoje)}${celulaTopo('DATA E HORA DA EMISSÃO DA NFS-E', `${hoje} ${agora} (prévia)`)}</tr>
    <tr>${celulaTopo('NÚMERO DA DPS', '(na emissão)')}${celulaTopo('SÉRIE DA DPS', '1')}${celulaTopo('DATA E HORA DA EMISSÃO DA DPS', `${hoje} 00:00:00`)}</tr>
    <tr>${celulaTopo('EMITENTE DA NFS-E', 'Prestador')}${celulaTopo('SITUAÇÃO DA NFS-E', 'PRÉVIA (não emitida)')}${celulaTopo('FINALIDADE', 'NFS-e regular')}</tr>
  </table>

  ${titulo('PRESTADOR DO SERVIÇO')}
  ${tabela(8, [
        [{ r: 'Nome / Nome Empresarial', v: ou(pr?.razao_social), span: 3 }, { r: 'CNPJ / CPF / NIF', v: ou(doc(pr?.cnpj || '')), span: 2 }, { r: 'Inscrição Municipal', v: '-', span: 2 }, { r: 'Telefone', v: ou(pr?.telefone) }],
        [{ r: 'Endereço', v: ou(pr?.endereco), span: 3 }, { r: 'E-mail', v: ou((pr?.email || '').toUpperCase()), span: 2 }, { r: 'Município', v: ou(pr?.municipio), span: 2 }, { r: 'CEP', v: ou(cep(pr?.cep || '')) }],
        [{ r: 'Simples Nacional na Data de Competência', v: ou(pr?.simples), span: 4 }, { r: 'Regime de Apuração Tributária pelo SN', v: pr?.simples?.startsWith('Optante') ? '1' : '-', span: 4 }],
    ])}

  ${titulo('TOMADOR DO SERVIÇO')}
  ${tabela(8, [
        [{ r: 'Nome / Nome Empresarial', v: ou(tn?.nome), span: 3 }, { r: 'CNPJ / CPF / NIF', v: ou(doc(tn?.documento || '')), span: 2 }, { r: 'Inscrição Municipal', v: '-', span: 2 }, { r: 'Telefone', v: ou(tn?.telefone) }],
        [{ r: 'Endereço', v: ou(tn?.endereco), span: 3 }, { r: 'E-mail', v: ou(tn?.email), span: 2 }, { r: 'Município', v: ou(tn?.municipio), span: 2 }, { r: 'CEP', v: ou(cep(tn?.cep || '')) }],
    ])}

  ${titulo('DESTINATÁRIO DA OPERAÇÃO')}
  ${faixa('O DESTINATÁRIO É O PRÓPRIO TOMADOR/ADQUIRENTE DA OPERAÇÃO')}
  ${titulo('INTERMEDIÁRIO DA OPERAÇÃO')}
  ${faixa('INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e')}

  ${titulo('SERVIÇO PRESTADO')}
  ${tabela(3, [
        [{ r: 'Código de Tributação Nacional / Municipal', v: ou(p.codigo_servico) }, { r: 'Código da NBS', v: ou(p.nbs) }, { r: 'Local da Prestação / Sigla UF / País', v: ou(cidadeLocal) }],
        [{ r: 'Descrição do Código de Tributação Nacional / Municipal', v: ou(DESCRICAO_CODIGO[p.codigo_servico]), span: 3 }],
        [{ r: 'Discriminação do Serviço', v: ou(semAcento(descricao)), span: 3 }],
    ])}

  ${titulo('TRIBUTAÇÃO MUNICIPAL (ISSQN)')}
  ${tabela(3, [
        [{ r: 'Tipo de Tributação do ISSQN', v: 'Operação tributável' }, { r: 'Município / UF / País de Incidência', v: ou(cidadeLocal) }, { r: 'Regime Especial de Tributação do ISSQN', v: '0' }],
        [{ r: 'Total Deduções / Reduções', v: '-' }, { r: 'Desconto Incondicionado', v: '-' }, { r: 'Base de Cálculo do ISSQN', v: p.iss_retido ? reais(p.valor) : '-' }],
        [{ r: 'Alíquota Aplicada', v: p.iss_retido ? `${p.aliquota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%` : '-' },
         { r: 'Retenção do ISSQN', v: p.iss_retido ? '<b>Retido pelo Tomador</b>' : 'Não retido' },
         { r: 'ISSQN Apurado', v: p.iss_retido ? reais(p.valor_iss) : '-' }],
    ])}

  ${titulo('TRIBUTAÇÃO FEDERAL (EXCETO CBS)')}
  ${tabela(3, [
        [{ r: 'IRRF', v: '-' }, { r: 'Contribuição Previdenciária - Retida', v: '-' }, { r: 'Contribuições Sociais - Retidas', v: '-' }],
        [{ r: 'PIS - Débito Apuração Própria', v: '-' }, { r: 'COFINS - Débito Apuração Própria', v: '-' }, { r: 'Descrição Contrib. Sociais - Retidas', v: '-' }],
    ])}

  ${titulo('TRIBUTAÇÃO IBS / CBS')}
  ${tabela(3, [
        [{ r: 'CST / cClassTrib', v: '-' }, { r: 'Indicador de Operação / Município Incidência', v: '-' }, { r: 'Base de Cálculo IBS/CBS', v: '-' }],
        [{ r: 'Valor Total Apurado - IBS', v: '-' }, { r: 'Alíquota CBS', v: '-' }, { r: 'Valor Total Apurado - CBS', v: '-' }],
    ])}

  ${titulo('VALOR TOTAL DA NFS-e')}
  ${tabela(3, [
        [{ r: 'VALOR DA OPERAÇÃO / SERVIÇO', v: reais(p.valor) }, { r: 'Desconto Incondicionado', v: '-' }, { r: 'Desconto Condicionado', v: '-' }],
        [{ r: 'Total das Retenções (ISSQN / Federais)', v: p.iss_retido ? reais(p.valor_iss) : '-' }, { r: 'VALOR LÍQUIDO DA NFS-e', v: reais(p.valor_liquido) }, { r: 'Total do IBS/CBS', v: '-' }],
    ])}

  ${titulo('INFORMAÇÕES COMPLEMENTARES')}
  <div style="${BORDA};margin-top:-1px;padding:4px 8px 8px;min-height:60px;font-size:11px;line-height:1.35;white-space:pre-line">${p.info_complementar ? esc(semAcento(p.info_complementar)) : ''}</div>
</div>`
}

/**
 * Abre o PDF da prévia em outra aba. Chamar direto no toque do botão: a aba é aberta antes de qualquer
 * espera (senão o navegador bloqueia). "dados" pode ser a busca da prévia ainda em andamento.
 */
export async function abrirPdfPreviaNota(dados: PreviaNota | Promise<PreviaNota>, descricao?: string) {
    const aba = window.open('', '_blank')
    aba?.document.write('<p style="font-family:Arial;padding:24px">Gerando o PDF de teste da nota (nada é enviado à prefeitura)...</p>')
    let p: PreviaNota
    try {
        p = await dados
    } catch (e) {
        aba?.close()
        throw e
    }
    const caixa = document.createElement('div')
    caixa.style.cssText = 'position:fixed;left:-10000px;top:0'
    caixa.innerHTML = montarHtml(p, descricao ?? p.descricao)
    document.body.appendChild(caixa)
    try {
        // Bibliotecas de PDF/captura são pesadas: só carregam ao gerar a prévia
        const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
        const canvas = await html2canvas(caixa.firstElementChild as HTMLElement, { scale: 2, backgroundColor: '#ffffff', logging: false })
        const pdf = new jsPDF('p', 'mm', 'a4')
        const largura = pdf.internal.pageSize.getWidth()
        const altura = Math.min((canvas.height * largura) / canvas.width, pdf.internal.pageSize.getHeight())
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, largura, altura)
        const url = String(pdf.output('bloburl'))
        if (aba) aba.location.href = url
        else window.open(url, '_blank')
    } catch (e) {
        aba?.close()
        throw e
    } finally {
        caixa.remove()
    }
}
