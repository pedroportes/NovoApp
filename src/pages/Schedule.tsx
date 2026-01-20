import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    addDays,
    subDays,
    parseISO,
    isSameDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, User, Layers } from 'lucide-react'
import { useOfflineServiceOrders, useOfflineTechnicians } from '@/hooks/useOfflineData'
import { Button } from '@/components/ui/button'
import { SyncService } from '@/services/syncService'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Schedule() {
    const navigate = useNavigate()
    const { userData } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
    const { orders, loading } = useOfflineServiceOrders()
    const { technicians } = useOfflineTechnicians()
    const [draggedOrder, setDraggedOrder] = useState<any | null>(null)

    // Calendar Calculations for Month View
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        return eachDayOfInterval({ start: startDate, end: endDate })
    }, [currentDate])

    // Handlers
    const nextPeriod = () => {
        if (viewMode === 'month') {
            setCurrentDate(addMonths(currentDate, 1))
        } else {
            setCurrentDate(addDays(currentDate, 1))
        }
    }

    const prevPeriod = () => {
        if (viewMode === 'month') {
            setCurrentDate(subMonths(currentDate, 1))
        } else {
            setCurrentDate(subDays(currentDate, 1))
        }
    }

    const goToToday = () => {
        const today = new Date()
        setCurrentDate(today)
        if (viewMode === 'day' && !isSameDay(today, currentDate)) {
            // Stay in day view but go to today
        }
    }

    const handleDragStart = (e: React.DragEvent, order: any) => {
        setDraggedOrder(order)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e: React.DragEvent, targetDate: Date, timeStr?: string) => {
        e.preventDefault()
        if (!draggedOrder) return

        const newDateStr = format(targetDate, 'yyyy-MM-dd')

        // If dropping into a specific time slot (Day View) use that time, otherwise keep original time or default
        let newDateTime = newDateStr
        if (timeStr) {
            newDateTime = `${newDateStr}T${timeStr}:00`
        } else if (draggedOrder.data_agendamento && draggedOrder.data_agendamento.includes('T')) {
            // Keep original time if dropped in Month View
            const timePart = draggedOrder.data_agendamento.split('T')[1]
            newDateTime = `${newDateStr}T${timePart}`
        } else {
            newDateTime = `${newDateStr}T09:00:00`
        }

        // Prevent update if no change (roughly)
        if (draggedOrder.data_agendamento === newDateTime) {
            setDraggedOrder(null)
            return
        }

        try {
            const updatedOrder = {
                ...draggedOrder,
                data_agendamento: newDateTime,
                synced: 0, // Mark as needing sync
                action: 'update',
                updated_at: new Date().toISOString()
            }

            await SyncService.saveServiceOrder(updatedOrder)
            toast.success(`Reagendado para ${format(parseISO(newDateTime), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}`)

        } catch (error) {
            console.error("Failed to reschedule", error)
            toast.error("Erro ao reagendar")
        } finally {
            setDraggedOrder(null)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'CONCLUIDO': return 'bg-emerald-100/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
            case 'CANCELADO': return 'bg-red-100/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'
            case 'EM_ANDAMENTO': return 'bg-blue-100/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900'
            default: return 'bg-amber-100/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' // PENDENTE
        }
    }

    // Helper to get orders for a specific day
    const getDayOrders = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return orders?.filter(o =>
            o.data_agendamento && o.data_agendamento.startsWith(dateStr)
        ) || []
    }

    return (
        <div className="min-h-screen bg-background flex flex-col md:pb-0 pb-20 transition-colors duration-300">
            {/* Header */}
            <div className="bg-card border-b border-border p-4 sticky top-0 z-20 shadow-sm transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-primary" />
                            Agenda
                        </h1>
                        <div className="bg-muted p-1 rounded-lg flex items-center ml-4">
                            <button
                                onClick={() => setViewMode('month')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                    viewMode === 'month' ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Mês
                            </button>
                            <button
                                onClick={() => setViewMode('day')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                    viewMode === 'day' ? "bg-card shadow text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Dia
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={goToToday} className="hidden md:flex bg-card hover:bg-muted text-foreground border-border">
                            Hoje
                        </Button>
                        <div className="flex items-center bg-muted rounded-lg p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background" onClick={prevPeriod}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="min-w-[140px] text-center font-bold text-foreground text-sm capitalize">
                                {viewMode === 'month'
                                    ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                                    : format(currentDate, "dd 'de' MMMM", { locale: ptBR })
                                }
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background" onClick={nextPeriod}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                            size="sm"
                            onClick={() => {
                                const dateParam = format(currentDate, 'yyyy-MM-dd')
                                navigate(`/service-orders/new?date=${dateParam}`)
                                // navigate(`/new-order?date=${dateParam}`)
                            }}
                        >
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Novo</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-background/50 transition-colors">
                {viewMode === 'month' ? (
                    /* MONTH VIEW */
                    <div className="max-w-7xl mx-auto p-2 md:p-6 h-full flex flex-col">
                        <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border overflow-hidden flex-1 flex flex-col transition-all duration-300">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 border-b border-border bg-muted/30 flex-none">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days */}
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-border divide-y divide-border">
                                {calendarDays.map((day) => {
                                    const isCurrentMonth = isSameMonth(day, currentDate)
                                    const isDayToday = isToday(day)
                                    const dayOrders = getDayOrders(day)

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, day)}
                                            onClick={(e) => {
                                                if (e.target === e.currentTarget) {
                                                    // Switch to Day View on click
                                                    setCurrentDate(day)
                                                    setViewMode('day')
                                                }
                                            }}
                                            className={cn(
                                                "relative p-2 transition-colors cursor-pointer hover:bg-muted/50 min-h-[100px]",
                                                !isCurrentMonth && "bg-muted/10 opacity-50",
                                                isDayToday && "bg-primary/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "text-xs font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                                isDayToday
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                                    : "text-muted-foreground group-hover:bg-muted"
                                            )}>
                                                {format(day, 'd')}
                                            </div>

                                            <div className="space-y-1.5 overflow-hidden">
                                                {dayOrders.slice(0, 4).map(order => {
                                                    const tech = technicians?.find((t: any) => t.id === order.tecnico_id)
                                                    const techName = tech?.nome_completo?.split(' ')[0] || (tech as any)?.nome || 'Técnico'

                                                    // Helper to handle both propery cases if needed or just assert type
                                                    const time = (order as any).hora_agendamento?.slice(0, 5) || format(parseISO(order.data_agendamento), 'HH:mm')

                                                    return (
                                                        <div
                                                            key={order.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, order)}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                navigate(`/service-orders/${order.id}`)
                                                            }}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-1 rounded border cursor-grab active:cursor-grabbing hover:shadow-md transition-all truncate border-l-2",
                                                                getStatusColor(order.status)
                                                            )}
                                                        >
                                                            <span className="font-bold mr-1">{time}</span>
                                                            {order.cliente_nome?.split(' ')[0]}
                                                        </div>
                                                    )
                                                })}
                                                {dayOrders.length > 4 && (
                                                    <div className="text-[10px] text-center text-muted-foreground font-medium">
                                                        +{dayOrders.length - 4} mais
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* DAY VIEW (Google Calendar Style) */
                    <div className="max-w-4xl mx-auto p-2 md:p-6 h-full">
                        <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border flex h-full overflow-hidden flex-col transition-all duration-300">
                            {/* Header Day Info */}
                            <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-sm font-bold text-primary uppercase tracking-widest mb-1">
                                        {format(currentDate, 'eeee', { locale: ptBR })}
                                    </div>
                                    <div className="text-3xl font-black text-foreground">
                                        {format(currentDate, 'dd')}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Scroll Area */}
                            <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-card">
                                {/* Current Time Indicator (if today) */}
                                {isToday(currentDate) && (
                                    <div
                                        className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                        style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * (80 / 60) + 20}px` }} // 80px per hour
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                                    </div>
                                )}

                                {/* Hours Grid */}
                                {Array.from({ length: 24 }).map((_, hour) => {
                                    // Filter orders in this hour
                                    const dayOrders = getDayOrders(currentDate)
                                    const hourOrders = dayOrders.filter(o => {
                                        const orderDate = parseISO(o.data_agendamento)
                                        return orderDate.getHours() === hour
                                    })

                                    return (
                                        <div
                                            key={hour}
                                            className="min-h-[80px] border-b border-border flex group"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, currentDate, hour.toString().padStart(2, '0'))}
                                        >
                                            {/* Time Column */}
                                            <div className="w-16 flex-none border-r border-border p-2 text-xs font-bold text-muted-foreground text-right sticky left-0 bg-card group-hover:bg-muted/20 transition-colors">
                                                {hour.toString().padStart(2, '0')}:00
                                            </div>

                                            {/* Content Column */}
                                            <div
                                                className="flex-1 p-1 relative hover:bg-muted/10 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    const dateStr = format(currentDate, 'yyyy-MM-dd')
                                                    navigate(`/new-order?date=${dateStr}&time=${hour.toString().padStart(2, '0')}:00`)
                                                }}
                                            >
                                                {/* Render Orders in this hour */}
                                                <div className="flex flex-row gap-2 absolute inset-1 overflow-x-auto">
                                                    {hourOrders.map(order => {
                                                        const tech = technicians?.find((t: any) => t.id === order.tecnico_id)
                                                        const techName = tech?.nome_completo?.split(' ')[0] || (tech as any)?.nome || 'Técnico'
                                                        const minutes = parseISO(order.data_agendamento).getMinutes()
                                                        const topOffset = (minutes / 60) * 100 // Percentage

                                                        return (
                                                            <div
                                                                key={order.id}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, order)}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigate(`/service-orders/${order.id}`)
                                                                }}
                                                                className={cn(
                                                                    "min-w-[150px] p-2 rounded-lg border-l-4 shadow-sm text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:scale-[1.02] z-10 h-auto",
                                                                    getStatusColor(order.status).replace('bg-', 'bg-opacity-90 bg-')
                                                                )}
                                                                style={{
                                                                    // For simplicity in this list view, we stack them horizontally,
                                                                    // but visually they might represent specific start times.
                                                                    // To simulate exact placement:
                                                                    marginTop: `${topOffset}%`
                                                                }}
                                                            >
                                                                <div className="font-bold truncate text-sm text-slate-800 dark:text-slate-100">
                                                                    {order.cliente_nome || 'Cliente'}
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-80 mb-1 text-slate-600 dark:text-slate-300">
                                                                    <User className="h-3 w-3" />
                                                                    {techName}
                                                                </div>
                                                                <div className="opacity-70 truncate text-slate-600 dark:text-slate-300">
                                                                    {order.descricao_servico}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
