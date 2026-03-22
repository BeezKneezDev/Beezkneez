import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LawnMowing from './pages/LawnMowing'
import HedgeTrimming from './pages/HedgeTrimming'
import GardenTidyUps from './pages/GardenTidyUps'
import ServicesPage from './pages/ServicesPage'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/dashboard/Customers'
import CustomerDetail from './pages/dashboard/CustomerDetail'
import Jobs from './pages/dashboard/Jobs'
import JobDetail from './pages/dashboard/JobDetail'
import Services from './pages/dashboard/Services'
import Quotes from './pages/dashboard/Quotes'
import Calendar from './pages/dashboard/Calendar'
import Invoices from './pages/dashboard/Invoices'
import InvoiceDetail from './pages/dashboard/InvoiceDetail'
import QuoteDetail from './pages/dashboard/QuoteDetail'
import Flyer from './pages/Flyer'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lawn-mowing" element={<LawnMowing />} />
      <Route path="/hedge-trimming" element={<HedgeTrimming />} />
      <Route path="/garden-tidy-ups" element={<GardenTidyUps />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/flyer" element={<Flyer />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="services" element={<Services />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
