import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './hooks/useToast'
import AppLayout from './components/layout/AppLayout'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import PurchaseOrders from './pages/PurchaseOrders'
import Shipments from './pages/Shipments'
import Alerts from './pages/Alerts'
import Products from './pages/Products'
import Suppliers from './pages/Suppliers'
import Warehouses from './pages/Warehouses'
import Users from './pages/Users'
import ResetPassword from './pages/ResetPassword'
import Spinner from './components/ui/Spinner'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size={32} />
      </div>
    )
  }
  return user ? children : <Navigate to="/auth" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return children
  const dest = user.role === 'supplier' ? '/purchase-orders' : '/dashboard'
  return <Navigate to={dest} replace />
}

function RoleRoute({ children, roles }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) {
    const fallback = user?.role === 'supplier' ? '/purchase-orders' : '/dashboard'
    return <Navigate to={fallback} replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth"           element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Private app */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard"       element={<RoleRoute roles={['admin','procurement_manager','warehouse_staff','viewer']}><Dashboard /></RoleRoute>} />
        <Route path="/inventory"       element={<RoleRoute roles={['admin','procurement_manager','warehouse_staff','viewer']}><Inventory /></RoleRoute>} />
        <Route path="/products"        element={<RoleRoute roles={['admin','procurement_manager','viewer']}><Products /></RoleRoute>} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/shipments"       element={<Shipments />} />
        <Route path="/alerts"          element={<RoleRoute roles={['admin','procurement_manager','warehouse_staff','viewer']}><Alerts /></RoleRoute>} />
        <Route path="/suppliers"       element={<RoleRoute roles={['admin','procurement_manager','viewer']}><Suppliers /></RoleRoute>} />
        <Route path="/warehouses"      element={<RoleRoute roles={['admin','procurement_manager','warehouse_staff','viewer']}><Warehouses /></RoleRoute>} />
        <Route path="/users"           element={<RoleRoute roles={['admin','procurement_manager']}><Users /></RoleRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
