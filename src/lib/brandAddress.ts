// Endereço de uma empresa/filial (empresas_marcas) montado SÓ com os dados dela.
// Nunca misturar com os campos da matriz (tabela empresas): cada recibo mostra os dados verdadeiros da filial.

const limpa = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

export function enderecoDaMarca(m: any): string {
    if (!m) return ''
    const rua = limpa(m.endereco || m.logradouro)
    const numero = limpa(m.numero)
    const linha1 = [rua, numero && !rua.includes(numero) ? numero : '', limpa(m.complemento)].filter(Boolean).join(', ')
    const cidadeUf = [limpa(m.cidade), limpa(m.estado || m.uf)].filter(Boolean).join(' - ')
    const cep = limpa(m.cep) ? `CEP ${limpa(m.cep)}` : ''
    return [linha1, limpa(m.bairro), cidadeUf, cep].filter(Boolean).join(' - ')
}
