import React from 'react'

interface ServiceOrderPrintProps {
    os: any
    company: any
}

// ==========================================
// RECEIPT / BUDGET LAYOUT
// ==========================================
const ReceiptLayout = ({ os, company, title }: { os: any, company: any, title: string }) => {
    // Helper for formatting currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    // Helper for formatting date
    const formatDate = (dateString: string) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    const calculateTotal = () => {
        if (os.itens && Array.isArray(os.itens)) {
            return os.itens.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0)
        }
        return 0
    }

    const formatAddress = (obj: any) => {
        if (obj?.endereco) return obj.endereco;
        if (!obj) return '';
        const parts = [
            obj.logradouro,
            obj.numero ? `Nº ${obj.numero}` : '',
            obj.bairro,
            obj.cidade,
            obj.uf,
            obj.cep
        ].filter(Boolean);
        return parts.join(', ');
    }

    const subtotal = calculateTotal()
    const discountValue = os.desconto ? (subtotal * os.desconto) / 100 : 0
    const finalTotal = os.valor_total || (subtotal - discountValue)

    return (
        <div className="p-4 md:p-8 bg-white text-black font-sans max-w-[210mm] mx-auto print:p-0 print:max-w-none relative text-[10px] md:text-xs">
            {/* Main Border Container */}
            <div className="border-2 border-black relative flex flex-col min-h-[95vh]">

                {/* Header */}
                <div className="border-b-2 border-black flex">
                    {/* Logo Area */}
                    <div className="w-[30%] border-r-2 border-black p-2 flex items-center justify-center overflow-hidden">
                        <div className="text-center w-full">
                            <div className="flex items-center justify-center min-h-[80px]">
                                <img
                                    src={company?.logo_url || '/flowdrain-logo.png'}
                                    alt="Logo"
                                    className="max-w-[140px] max-h-[100px] object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const parent = e.currentTarget.parentElement!
                                        parent.textContent = '🏢'
                                        parent.classList.add('text-4xl', 'text-gray-300')
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Company Info */}
                    <div className="w-[70%] p-2 md:p-4 flex flex-col justify-center text-center">
                        <h1 className="text-lg md:text-2xl font-bold uppercase mb-1">{company?.nome || 'NOME DA EMPRESA'}</h1>
                        <p className="text-[10px] md:text-sm font-semibold uppercase tracking-widest text-gray-600">QUALIDADE E SATISFAÇÃO</p>
                    </div>
                </div>

                {/* Sub-Header: Address & Contact */}
                <div className="border-b-2 border-black flex text-sm">
                    <div className="w-1/2 p-2 px-4 border-r-2 border-black">
                        {formatAddress(company) || 'Endereço da Empresa aqui'}
                    </div>
                    <div className="w-1/2 p-2 px-4">
                        <div><span className="font-bold">CNPJ:</span> {company?.cnpj || '00.000.000/0000-00'}</div>
                        <div><span className="font-bold">Telefone:</span> {company?.telefone || '(00) 0000-0000'}</div>
                    </div>
                </div>

                {/* Title Bar */}
                <div className="bg-gray-200 border-b border-black md:border-b-2 p-1 md:p-2 text-center font-bold text-sm md:text-lg uppercase">
                    ID Nº {os.id?.slice(0, 8)} - {title}
                </div>

                {/* Client Info Grid */}
                <div className="border-b-2 border-black text-sm">
                    <div className="flex border-b border-black">
                        <div className="w-32 bg-gray-100 p-1 px-2 font-bold border-r border-black flex items-center">Nome Cliente</div>
                        <div className="flex-1 p-1 px-2 uppercase">{os.cliente_nome || os.clientes?.nome_razao || 'Cliente não informado'}</div>
                    </div>
                    <div className="flex border-b border-black">
                        <div className="w-32 bg-gray-100 p-1 px-2 font-bold border-r border-black flex items-center">CPF/CNPJ</div>
                        <div className="flex-1 p-1 px-2">{os.clientes?.cpf_cnpj || ''}</div>
                    </div>
                    <div className="flex border-b border-black">
                        <div className="w-32 bg-gray-100 p-1 px-2 font-bold border-r border-black flex items-center">Endereço</div>
                        <div className="flex-1 p-1 px-2 uppercase">{formatAddress(os.clientes) || ''}</div>
                    </div>
                    <div className="flex">
                        <div className="w-32 bg-gray-100 p-1 px-2 font-bold border-r border-black flex items-center">Telefone</div>
                        <div className="flex-1 p-1 px-2">{os.cliente_whatsapp || os.clientes?.whatsapp || ''}</div>
                    </div>
                </div>

                {/* Items Header */}
                <div className="flex bg-gray-200 border-b-2 border-black text-sm font-bold">
                    <div className="flex-1 p-2 border-r-2 border-black">Serviço que foi Feito / Descrição</div>
                    <div className="w-32 p-2 text-right">Valor</div>
                </div>

                {/* Items List */}
                <div className="flex-1">
                    {os.itens && os.itens.map((item: any, index: number) => (
                        <div key={index} className="flex border-b border-black text-sm">
                            <div className="flex-1 p-2 border-r-2 border-black uppercase min-h-[32px]">
                                {item.descricao}
                                {item.qtd > 1 && <span className="text-xs text-gray-500 ml-2">(x{item.qtd})</span>}
                            </div>
                            <div className="w-32 p-2 text-right flex items-center justify-end font-semibold">
                                {formatCurrency(item.total)}
                            </div>
                        </div>
                    ))}
                    {/* Fill remaining space if list is short (optional for printed sheets look) */}
                    <div className="flex-1"></div>
                </div>

                {/* Date and Total */}
                <div className="border-t-2 border-black flex font-bold border-b-2 overflow-hidden">
                    <div className="flex-1 flex border-r-2 border-black">
                        <div className="bg-gray-100 p-2 px-4 border-r-2 border-black flex items-center uppercase text-[10px]">Data que foi feito</div>
                        <div className="p-2 px-4 flex items-center">{formatDate(os.data_agendamento)}</div>
                    </div>
                    <div className="flex flex-col">
                        {os.desconto > 0 && (
                            <div className="flex border-b-2 border-black">
                                <div className="bg-gray-100 p-1 px-4 border-r-2 border-black flex-1 flex items-center text-xs justify-end uppercase">Desconto ({os.desconto}%)</div>
                                <div className="p-1 px-4 text-sm flex items-center min-w-[128px] justify-end text-red-600">
                                    - {formatCurrency(discountValue)}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-1">
                            <div className="bg-gray-100 p-2 px-4 border-r-2 border-black flex-1 flex items-center justify-end text-[10px] uppercase">Valor do Serviço - Total</div>
                            <div className="p-2 px-4 text-base md:text-xl flex items-center min-w-[128px] justify-end whitespace-nowrap">{formatCurrency(finalTotal)}</div>
                        </div>
                    </div>
                </div>

                {/* Observations */}
                {os.observacoes && (
                    <div className="p-2 border-b-2 border-black text-sm bg-yellow-50/50">
                        <span className="font-bold block text-xs uppercase mb-1">Observações:</span>
                        <span className="uppercase whitespace-pre-wrap">{os.observacoes}</span>
                    </div>
                )}

                {/* Signature Section - Receipt Layout */}
                <div className="mt-4 border-2 border-black flex h-32 md:h-48 mx-2 md:mx-4 mb-4">
                    {/* LEFT SIDE: CLIENT SIGNATURE */}
                    <div className="w-1/3 flex flex-col items-center justify-between border-r-2 border-black p-1 md:p-2 font-bold text-[10px] md:text-sm text-center relative h-full">
                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                            {os.assinatura_cliente_url ? (
                                <img src={os.assinatura_cliente_url} alt="Assinatura Cliente" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <span className="text-gray-200 text-xs italic opacity-0">.</span>
                            )}
                        </div>
                        <span className="w-full border-t border-black pt-1">Assinatura do Cliente</span>
                    </div>

                    {/* RIGHT SIDE: COMPANY SIGNATURE */}
                    <div className="w-2/3 flex flex-col items-center justify-between p-1 md:p-2 h-full">
                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                            {company?.assinatura_url && (
                                <img src={company.assinatura_url} alt="Assinatura Empresa" className="max-w-full max-h-full object-contain" />
                            )}
                        </div>
                        <div className="w-full text-center">
                            <div className="border-t border-black w-full pt-1 mb-1"></div>
                            <span className="text-[10px] md:text-xs font-bold uppercase block">
                                {company?.nome || 'Desentupidora'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Disclaimer/Footer */}
                <div className="text-center p-2 text-[10px] text-gray-500 border-t border-black mt-auto">
                    Todos os serviços têm uma garantia de 30 dias exceto vaso sanitário e limpeza de caixa de gordura.
                    {os.tipo === 'ORCAMENTO' && os.validade && (
                        <span className="block font-bold mt-1 text-black">
                            ESTE ORÇAMENTO É VÁLIDO ATÉ {formatDate(os.validade)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// ==========================================
// CONTRACT LAYOUT
// ==========================================
const ContractLayout = ({ os, company }: { os: any, company: any }) => {
    const formatDate = (dateString: string) => {
        if (!dateString) return '____/____/____'
        return new Date(dateString).toLocaleDateString('pt-BR')
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const subtotal = os.itens ? os.itens.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0) : 0
    const discountValue = os.desconto ? (subtotal * os.desconto) / 100 : 0
    const totalValue = os.valor_total || (subtotal - discountValue)

    const formatAddress = (obj: any) => {
        if (obj?.endereco) return obj.endereco;
        if (!obj) return '';
        const parts = [
            obj.logradouro,
            obj.numero ? `Nº ${obj.numero}` : '',
            obj.bairro,
            obj.cidade,
            obj.uf,
            obj.cep
        ].filter(Boolean);
        return parts.join(', ');
    }

    return (
        <div className="p-12 bg-white text-black font-serif max-w-[210mm] mx-auto print:p-8 leading-relaxed text-justify text-sm">
            <h1 className="text-2xl font-bold text-center mb-8 uppercase border-b-2 border-black pb-4">
                Contrato de Prestação de Serviços
            </h1>

            <p className="mb-4">
                Pelo presente instrumento particular, de um lado <strong>{company?.nome || 'CONTRATADA'}</strong>,
                inscrita no CNPJ sob o nº <strong>{company?.cnpj || '______________'}</strong>,
                situada em {formatAddress(company) || '_________________________'}, doravante denominada <strong>CONTRATADA</strong>.
            </p>

            <p className="mb-6">
                E de outro lado <strong>{os.cliente_nome || os.clientes?.nome_razao || 'CLIENTE'}</strong>,
                CPF/CNPJ nº <strong>{os.clientes?.cpf_cnpj || '__________________'}</strong>,
                residente/sediado em {formatAddress(os.clientes) || '___________________________'},
                doravante denominado <strong>CONTRATANTE</strong>.
            </p>

            <h2 className="font-bold text-lg mb-2 mt-6">CLÁUSULA PRIMEIRA - DO OBJETO</h2>
            <p className="mb-4">
                O presente contrato tem por objeto a prestação de serviços de desentupimento e/ou limpeza conforme descritos abaixo:
            </p>
            <ul className="list-disc pl-8 mb-4 bg-gray-50 p-4 border rounded">
                {os.itens && os.itens.map((item: any, index: number) => (
                    <li key={index}>
                        <span className="font-bold">{item.descricao}</span>
                        {item.qtd > 1 ? ` (Qtd: ${item.qtd})` : ''} - {formatCurrency(item.total)}
                    </li>
                ))}
            </ul>

            <h2 className="font-bold text-lg mb-2 mt-6">CLÁUSULA SEGUNDA - DO VALOR E PAGAMENTO</h2>
            <p className="mb-4">
                Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor total de <strong>{formatCurrency(totalValue)}</strong>.
                {os.desconto > 0 && ` (Já incluso desconto de ${os.desconto}%).`}
                O pagamento será realizado conforme acordado entre as partes na data de execução do serviço.
            </p>

            <h2 className="font-bold text-lg mb-2 mt-6">CLÁUSULA TERCEIRA - DA GARANTIA</h2>
            <p className="mb-4">
                A CONTRATADA oferece garantia de 30 (trinta) dias para os serviços executados, exceto para desentupimento de vasos sanitários e limpeza de caixas de gordura,
                que possuem condições específicas de garantia ou isenção da mesma dependendo das condições de uso.
                A garantia cobre apenas o ressurgimento do problema no mesmo local e sob as mesmas condições, não cobrindo mau uso posterior.
            </p>

            <h2 className="font-bold text-lg mb-2 mt-6">CLÁUSULA QUARTA - DAS OBRIGAÇÕES</h2>
            <p className="mb-4">
                Compromete-se a CONTRATADA a realizar os serviços com zelo e eficiência. O CONTRATANTE compromete-se a fornecer as condições necessárias para a execução do serviço.
            </p>

            {os.observacoes && (
                <>
                    <h2 className="font-bold text-lg mb-2 mt-6">OBSERVAÇÕES ADICIONAIS</h2>
                    <p className="mb-4 bg-yellow-50 p-2 rounded border border-yellow-100">{os.observacoes}</p>
                </>
            )}

            <div className="mt-16 text-center">
                <p className="mb-8">
                    {company?.cidade || 'Cidade'}, {formatDate(os.data_agendamento || new Date().toISOString())}
                </p>

                <div className="flex justify-between gap-8 mt-12">
                    <div className="flex-1 border-t border-black pt-2 flex flex-col items-center">
                        {company?.assinatura_url && (
                            <img src={company.assinatura_url} alt="Assinatura Contratada" className="h-12 -mt-16 mb-2 object-contain" />
                        )}
                        <p className="font-bold">{company?.nome || 'CONTRATADA'}</p>
                        <p className="text-xs text-gray-500">Assinatura da Contratada</p>
                    </div>
                    <div className="flex-1 border-t border-black pt-2 flex flex-col items-center">
                        {os.assinatura_cliente_url && (
                            <img src={os.assinatura_cliente_url} alt="Assinatura Cliente" className="h-12 -mt-16 mb-2 object-contain" />
                        )}
                        <p className="font-bold">{os.cliente_nome || 'CONTRATANTE'}</p>
                        <p className="text-xs text-gray-500">Assinatura do Contratante</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export const ServiceOrderPrint = React.forwardRef<HTMLDivElement, ServiceOrderPrintProps>((props, ref) => {
    const { os, company } = props

    // Determine Layout
    const type = os.tipo || 'RECIBO'

    if (type === 'CONTRATO') {
        return <div ref={ref}><ContractLayout os={os} company={company} /></div>
    }

    // Default to Receipt layout (handles ORCAMENTO and RECIBO)
    let title = 'RECIBO DE PRESTAÇÃO DE SERVIÇOS'
    if (type === 'ORCAMENTO') {
        title = 'ORÇAMENTO DE PRESTAÇÃO DE SERVIÇOS'
    }

    return (
        <div ref={ref}>
            <ReceiptLayout os={os} company={company} title={title} />
        </div>
    )
})

ServiceOrderPrint.displayName = 'ServiceOrderPrint'
