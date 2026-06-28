import { Routes, Route, Navigate } from 'react-router'
import { useAuth } from './hooks/useAuth'
import Home from './pages/Home'
import Dev from './pages/Dev'
import BookAppointment from './pages/BookAppointment'
import Admin from './pages/Admin'
import FrontDesk from './pages/FrontDesk'
import Login from './pages/Login'
import Doctor from './pages/Doctor'
import Pharmacy from './pages/Pharmacy'
import Diagnostics from './pages/Diagnostics'
import NotFound from './pages/NotFound'
import LanguageSelector from './components/LanguageSelector'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Loader2 } from 'lucide-react'

const ALLOWED_ROLES: Record<string, string[]> = {
  "/admin": ["founder", "admin", "staff", "user"],
  "/dev": ["founder", "admin"],
  "/front-desk": ["front_desk", "founder", "admin"],
  "/doctor": ["doctor", "admin"],
  "/pharmacy": ["pharmacy"],
  "/diagnostics": ["diagnostics"],
}

function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const allowed = ALLOWED_ROLES[path]
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/admin" element={<ProtectedRoute path="/admin"><Admin /></ProtectedRoute>} />
        <Route path="/dev" element={<ProtectedRoute path="/dev"><Dev /></ProtectedRoute>} />
        <Route path="/front-desk" element={<ProtectedRoute path="/front-desk"><FrontDesk /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctor" element={<ProtectedRoute path="/doctor"><Doctor /></ProtectedRoute>} />
        <Route path="/pharmacy" element={<ProtectedRoute path="/pharmacy"><Pharmacy /></ProtectedRoute>} />
        <Route path="/diagnostics" element={<ProtectedRoute path="/diagnostics"><Diagnostics /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <LanguageSelector />
    </ErrorBoundary>
  )
}
