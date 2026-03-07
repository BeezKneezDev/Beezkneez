import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const authed = localStorage.getItem('bk_auth') === 'true'
  return authed ? <Outlet /> : <Navigate to="/login" replace />
}
