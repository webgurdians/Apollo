import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Admin from './pages/Admin'
import FrontDesk from './pages/FrontDesk'
import Login from './pages/Login'
import Doctor from './pages/Doctor'
import Pharmacy from './pages/Pharmacy'
import Diagnostics from './pages/Diagnostics'
import NotFound from './pages/NotFound'
import LanguageSelector from './components/LanguageSelector'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/front-desk" element={<FrontDesk />} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctor" element={<Doctor />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <LanguageSelector />
    </ErrorBoundary>
  )
}
