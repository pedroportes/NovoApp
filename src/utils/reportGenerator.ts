import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportData {
    companyName?: string
    dateRange: { start: Date; end: Date }
    stats: {
        revenue: number
        monthlyRevenue: number
        receivables: number
        payables: number
        activeServices: number
        newClients: number
        averageTicket: number
        commissions: number
    }
    clientGrowth: { month: string; newClients: number }[]
    technicianStats: {
        name: string
        totalCommissions: number
        servicesCount: number
    }[]
    recentActivities: any[]
    pendingExpenses: any[]
}

export const generateDashboardReport = (data: ReportData) => {
    const doc = new jsPDF()
    const currentDate = new Date().toLocaleDateString('pt-BR')
    const currentTime = new Date().toLocaleTimeString('pt-BR')

    // -- Header --
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text('Relatório Gerencial', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Gerado em: ${currentDate} às ${currentTime}`, 14, 28)
    doc.text(`Período de Análise: ${data.dateRange.start.toLocaleDateString()} a ${data.dateRange.end.toLocaleDateString()}`, 14, 33)
    if (data.companyName) {
        doc.text(`Empresa: ${data.companyName}`, 14, 38)
    }

    doc.setDrawColor(200, 200, 200)
    doc.line(14, 43, 196, 43)

    // -- Resumo Financeiro --
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Resumo Financeiro (Período Selecionado)', 14, 55)

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    const kpiData = [
        ['Faturamento Total (Histórico)', formatCurrency(data.stats.revenue)],
        ['Faturamento no Período', formatCurrency(data.stats.monthlyRevenue)],
        ['Ticket Médio', formatCurrency(data.stats.averageTicket)],
        ['A Receber (Previsto)', formatCurrency(data.stats.receivables)],
        ['Comissões (Total)', formatCurrency(data.stats.commissions)],
        ['A Pagar (Geral)', formatCurrency(data.stats.payables)],
    ]

    autoTable(doc, {
        startY: 60,
        head: [['Indicador', 'Valor']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }, // Default blueish
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' }
        }
    })

    let currentY = (doc as any).lastAutoTable.finalY + 15

    // -- Métricas Operacionais --
    doc.setFontSize(16)
    doc.text('Métricas Operacionais', 14, currentY)

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Métrica', 'Quantidade']],
        body: [
            ['Serviços Ativos', data.stats.activeServices.toString()],
            ['Novos Clientes', data.stats.newClients.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [39, 174, 96] }, // Greenish
        columnStyles: {
            1: { halign: 'right' }
        }
    })

    currentY = (doc as any).lastAutoTable.finalY + 15

    // -- Crescimento de Clientes (BI) --
    if (data.clientGrowth && data.clientGrowth.length > 0) {
        doc.setFontSize(16)
        doc.text('Crescimento de Clientes (Últimos 6 Meses)', 14, currentY)

        const growthBody = data.clientGrowth.map(g => [
            g.month,
            g.newClients.toString()
        ])

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Mês', 'Novos Clientes']],
            body: growthBody,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }, // Emerald
            columnStyles: {
                0: { cellWidth: 100 },
                1: { halign: 'right' }
            }
        })

        currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // -- Desempenho de Técnicos --
    if (data.technicianStats && data.technicianStats.length > 0) {
        doc.setFontSize(16)
        doc.text('Desempenho da Equipe', 14, currentY)

        const techBody = data.technicianStats.map(t => [
            t.name,
            t.servicesCount.toString(),
            formatCurrency(t.totalCommissions)
        ])

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Técnico', 'Serviços Realizados', 'Total Comissões']],
            body: techBody,
            theme: 'striped',
            headStyles: { fillColor: [211, 84, 0] }, // Pumpkin Orange
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right' }
            }
        })

        currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // -- Atividades Recentes --
    doc.setFontSize(16)
    doc.text('Últimas Atividades', 14, currentY)

    const activitiesBody = data.recentActivities.map(os => [
        new Date(os.created_at).toLocaleDateString(),
        os.cliente_nome || 'N/A',
        os.tecnico?.nome_completo?.split(' ')[0] || '-',
        os.status,
        formatCurrency(os.valor_total || 0)
    ])

    autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Cliente', 'Técnico', 'Status', 'Valor']],
        body: activitiesBody,
        theme: 'striped',
        headStyles: { fillColor: [142, 68, 173] }, // Purple
    })

    currentY = (doc as any).lastAutoTable.finalY + 15

    // -- Despesas Pendentes (Se houver) --
    if (data.pendingExpenses && data.pendingExpenses.length > 0) {
        // Check if we need a new page
        if (currentY > 250) {
            doc.addPage()
            currentY = 20
        }

        doc.setFontSize(16)
        doc.setTextColor(220, 53, 69) // Red
        doc.text('Despesas Pendentes de Aprovação', 14, currentY)

        const expensesBody = data.pendingExpenses.map(exp => [
            new Date(exp.created_at).toLocaleDateString(),
            exp.tecnico?.nome_completo?.split(' ')[0] || '-',
            exp.descricao,
            formatCurrency(exp.valor)
        ])

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Data', 'Técnico', 'Descrição', 'Valor']],
            body: expensesBody,
            theme: 'grid',
            headStyles: { fillColor: [192, 57, 43] } // Red
        })
    }

    // -- Footer --
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Página ${i} de ${pageCount} - FlowDrain SaaS`, 105, 290, { align: 'center' })
    }

    doc.save(`relatorio-gerencial-${new Date().toISOString().split('T')[0]}.pdf`)
}
