import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Login } from '@/pages/Login'
import { SignUp } from '@/pages/SignUp'
import { Technicians } from '@/pages/Technicians'
import { Clients } from '@/pages/Clients'
import { ServiceOrders } from './pages/ServiceOrders'
import { NewServiceOrder } from './pages/NewServiceOrder'
import { Services } from '@/pages/Services'
import { PrintServiceOrder } from '@/pages/PrintServiceOrder'
import { Settings } from './pages/Settings'
import { FinancialClosing } from './pages/FinancialClosing'
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from '@/contexts/AuthContext'
import { TechnicianDashboard } from './pages/TechnicianDashboard'
import { ProtectedRoute } from '@/components/ProtectedRoute'

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />

                        {/* Protected Routes */}
                        <Route element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/services" element={<Services />} />
                            <Route path="/technicians" element={<Technicians />} />
                            <Route path="/clients" element={<Clients />} />
                            <Route path="/service-orders" element={<ServiceOrders />} />
                            <Route path="/service-orders/new" element={<NewServiceOrder />} />
                            <Route path="/service-orders/:id" element={<NewServiceOrder />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/financial" element={<FinancialClosing />} />
                            <Route path="/tech-dashboard" element={<TechnicianDashboard />} />
                        </Route>

                        {/* Print Route (Authenticated but no Layout) */}
                        <Route path="/print/service-orders/:id" element={
                            <ProtectedRoute>
                                <PrintServiceOrder />
                            </ProtectedRoute>
                        } />

                        {/* Catch all - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default App

