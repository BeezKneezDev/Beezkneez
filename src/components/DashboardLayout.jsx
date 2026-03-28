import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../styles/dashboard.css'

const navItems = [
  { to: '/dashboard', icon: 'fa-solid fa-chart-line', label: 'Dashboard', end: true },
  { to: '/dashboard/kpi', icon: 'fa-solid fa-bullseye', label: 'KPIs' },
  { to: '/dashboard/leads', icon: 'fa-solid fa-bullhorn', label: 'Leads' },
  { to: '/dashboard/customers', icon: 'fa-solid fa-users', label: 'Customers' },
  { to: '/dashboard/jobs', icon: 'fa-solid fa-briefcase', label: 'Jobs' },
  { to: '/dashboard/calendar', icon: 'fa-solid fa-calendar-days', label: 'Calendar' },
  { to: '/dashboard/services', icon: 'fa-solid fa-leaf', label: 'Services' },
  { to: '/dashboard/quotes', icon: 'fa-solid fa-file-invoice', label: 'Quotes' },
  { to: '/dashboard/invoices', icon: 'fa-solid fa-receipt', label: 'Invoices' },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('bk_auth')
    navigate('/login')
  }

  const pageTitle = navItems.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label || 'Dashboard'

  return (
    <div className="dashboard">
      <div className="dash-topbar">
        <div className="dash-topbar-title">{pageTitle}</div>
        <div className="dash-topbar-user">Byron</div>
      </div>

      <button
        className="dash-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <i className={sidebarOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}></i>
      </button>

      <div
        className={`dash-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="dash-body">
        <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul className="dash-nav">
            {navItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                >
                  <i className={`${item.icon} dash-nav-icon`}></i> {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="dash-back-link">
            <Link to="/"><i className="fa-solid fa-arrow-left"></i> Back to site</Link>
            <button onClick={handleLogout} className="dash-logout-btn">
              <i className="fa-solid fa-right-from-bracket"></i> Log out
            </button>
          </div>
        </aside>

        <main className="dash-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
