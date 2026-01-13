import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { MainLayout } from '@/components/MainLayout'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Toaster } from 'sonner'
import { OfflineSyncProvider } from '@/components/OfflineSyncProvider'
import { ChatAssistant } from '@/components/ChatAssistant'

// Lazy Load Pages
const Dashboard = lazy(() => import('@/pages/Dashboard').then(module => ({ default: module.Dashboard })))
const Login = lazy(() => import('@/pages/Login').then(module => ({ default: module.Login })))
const SignUp = lazy(() => import('@/pages/SignUp').then(module => ({ default: module.SignUp })))
const Technicians = lazy(() => import('@/pages/Technicians').then(module => ({ default: module.Technicians })))
const Clients = lazy(() => import('@/pages/Clients').then(module => ({ default: module.Clients })))
const ClientImport = lazy(() => import('@/pages/ClientImport').then(module => ({ default: module.ClientImport })))
const ServiceOrders = lazy(() => import('./pages/ServiceOrders').then(module => ({ default: module.ServiceOrders })))
const NewServiceOrder = lazy(() => import('./pages/NewServiceOrder').then(module => ({ default: module.NewServiceOrder })))
const Services = lazy(() => import('@/pages/Services').then(module => ({ default: module.Services })))
const PrintServiceOrder = lazy(() => import('@/pages/PrintServiceOrder').then(module => ({ default: module.PrintServiceOrder })))
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })))
const Financial = lazy(() => import('./pages/Financial').then(module => ({ default: module.Financial })))
const Schedule = lazy(() => import('./pages/Schedule').then(module => ({ default: module.Schedule })))
const Plans = lazy(() => import('./pages/Plans').then(module => ({ default: module.Plans })))
const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard').then(module => ({ default: module.TechnicianDashboard })))
const TechnicianExpenses = lazy(() => import('./pages/TechnicianExpenses').then(module => ({ default: module.TechnicianExpenses })))
const TechnicianFinancial = lazy(() => import('./pages/TechnicianFinancial').then(module => ({ default: module.TechnicianFinancial })))
const TechnicianFinancialPrint = lazy(() => import('./pages/TechnicianFinancialPrint').then(module => ({ default: module.TechnicianFinancialPrint })))

const LoadingSpinner = () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
)

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <AuthProvider>
                <OfflineSyncProvider>
                    <Toaster richColors position="top-right" />
                    <ChatAssistant />
                    <BrowserRouter>
                        <Suspense fallback={<LoadingSpinner />}>
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<SignUp />} />

                                {/* Public Print Routes (Access via Link) */}
                                <Route path="/print/service-orders/:id" element={<PrintServiceOrder />} />
                                <Route path="/print/:id" element={<PrintServiceOrder />} />
                                <Route path="/tecnico/extrato" element={<TechnicianFinancialPrint />} />
                                <Route element={
                                    <ProtectedRoute>
                                        <MainLayout />
                                    </ProtectedRoute>
                                }>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/services" element={<Services />} />
                                    <Route path="/technicians" element={<Technicians />} />
                                    <Route path="/clients" element={<Clients />} />
                                    <Route path="/clients/import" element={<ClientImport />} />
                                    <Route path="/service-orders" element={<ServiceOrders />} />
                                    <Route path="/service-orders/new" element={<NewServiceOrder />} />
                                    <Route path="/service-orders/:id" element={<NewServiceOrder />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/financial" element={<Financial />} />
                                    <Route path="/schedule" element={<Schedule />} />
                                    <Route path="/tecnico/dashboard" element={<TechnicianDashboard />} />
                                    <Route path="/tech-dashboard" element={<TechnicianDashboard />} />
                                    <Route path="/tecnico/financeiro" element={<TechnicianFinancial />} />
                                    <Route path="/tecnico/financeiro" element={<TechnicianFinancial />} />
                                    <Route path="/expenses" element={<TechnicianExpenses />} />
                                    <Route path="/plans" element={<Plans />} />
                                </Route>


                                {/* Catch all - redirect to home */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </BrowserRouter>
                </OfflineSyncProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App

