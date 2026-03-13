import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getNextDate(currentDate, frequency) {
  const d = new Date(currentDate)
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'fortnightly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    default: break
  }
  return d.toISOString().split('T')[0]
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  // NZ weeks start Monday (day 0 = Sun → shift back 6, day 1 = Mon → shift 0)
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = startOfWeek(first)
  const cells = []
  const d = new Date(start)
  // Fill at least until end of month, then complete the row
  while (d <= last || cells.length % 7 !== 0) {
    cells.push(toDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return cells
}

function getWeekGrid(date) {
  const start = startOfWeek(date)
  const cells = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    cells.push(toDateStr(d))
  }
  return cells
}

function formatMonthTitle(date) {
  return date.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

function formatWeekTitle(startDate) {
  const end = new Date(startDate)
  end.setDate(end.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  const yr = end.getFullYear()
  return `${fmt(startDate)} — ${fmt(end)} ${yr}`
}

export default function Calendar() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchJobs() {
      const { data } = await supabase
        .from('jobs')
        .select('*, customers(id, name), services(id, name)')
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .order('scheduled_date', { ascending: true })
      if (data) setJobs(data)
      setLoading(false)
    }
    fetchJobs()
  }, [])

  const cells = useMemo(() => {
    if (view === 'month') {
      return getMonthGrid(currentDate.getFullYear(), currentDate.getMonth())
    }
    return getWeekGrid(currentDate)
  }, [currentDate, view])

  const rangeStart = cells[0]
  const rangeEnd = cells[cells.length - 1]

  // Build entries: real jobs + projected future occurrences
  const entriesByDate = useMemo(() => {
    const map = {}
    for (const job of jobs) {
      if (!job.scheduled_date) continue

      // Place the actual job on its scheduled_date if in range
      if (job.scheduled_date >= rangeStart && job.scheduled_date <= rangeEnd) {
        if (!map[job.scheduled_date]) map[job.scheduled_date] = []
        map[job.scheduled_date].push({
          id: job.id,
          label: job.services?.name || job.type || 'Job',
          customer: job.customers?.name || '',
          status: job.status,
          projected: false,
        })
      }

      // For recurring jobs, project forward
      if (job.frequency && job.frequency !== 'one_off') {
        let next = getNextDate(job.scheduled_date, job.frequency)
        let count = 0
        while (next <= rangeEnd && count < 52) {
          if (next >= rangeStart) {
            if (!map[next]) map[next] = []
            map[next].push({
              id: job.id,
              label: job.services?.name || job.type || 'Job',
              customer: job.customers?.name || '',
              status: job.status,
              projected: true,
            })
          }
          next = getNextDate(next, job.frequency)
          count++
        }
      }
    }
    return map
  }, [jobs, rangeStart, rangeEnd])

  const todayStr = toDateStr(new Date())
  const currentMonth = currentDate.getMonth()

  function goToday() {
    setCurrentDate(new Date())
  }

  function goPrev() {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() - 1)
    } else {
      d.setDate(d.getDate() - 7)
    }
    setCurrentDate(d)
  }

  function goNext() {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() + 1)
    } else {
      d.setDate(d.getDate() + 7)
    }
    setCurrentDate(d)
  }

  const title = view === 'month'
    ? formatMonthTitle(currentDate)
    : formatWeekTitle(startOfWeek(currentDate))

  const MAX_MONTH_ENTRIES = 3

  return (
    <>
      <div className="dash-breadcrumb">
        <Link to="/dashboard">home</Link> &rsaquo; calendar
      </div>

      <div className="dash-header">
        <h1>Calendar</h1>
      </div>

      <div className="cal-controls">
        <div className="cal-nav">
          <button className="dash-btn-secondary" onClick={goPrev}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button className="dash-btn-secondary" onClick={goToday}>Today</button>
          <button className="dash-btn-secondary" onClick={goNext}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <span className="cal-title">{title}</span>
        </div>
        <div className="cal-view-toggle">
          <button
            className={`dash-btn-secondary ${view === 'month' ? 'cal-view-active' : ''}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={`dash-btn-secondary ${view === 'week' ? 'cal-view-active' : ''}`}
            onClick={() => setView('week')}
          >
            Week
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Loading...</p>
      ) : (
        <div className="cal-grid">
          {DAY_NAMES.map(d => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {cells.map(dateStr => {
            const entries = entriesByDate[dateStr] || []
            const cellDate = new Date(dateStr + 'T00:00:00')
            const isToday = dateStr === todayStr
            const isOutside = view === 'month' && cellDate.getMonth() !== currentMonth
            const dayNum = cellDate.getDate()
            const showEntries = view === 'week' ? entries : entries.slice(0, MAX_MONTH_ENTRIES)
            const overflow = view === 'month' && entries.length > MAX_MONTH_ENTRIES
              ? entries.length - MAX_MONTH_ENTRIES
              : 0

            return (
              <div
                key={dateStr}
                className={`cal-cell ${view === 'week' ? 'cal-cell--week' : ''} ${isToday ? 'cal-cell--today' : ''} ${isOutside ? 'cal-cell--outside' : ''}`}
              >
                <div className="cal-day-num">{dayNum}</div>
                {showEntries.map((entry, i) => (
                  <div
                    key={`${entry.id}-${i}`}
                    className={`cal-entry ${entry.projected ? 'cal-entry--projected' : entry.status === 'completed' ? 'cal-entry--completed' : 'cal-entry--scheduled'}`}
                    onClick={() => navigate(`/dashboard/jobs/${entry.id}`)}
                    title={`${entry.label}${entry.customer ? ' — ' + entry.customer : ''}${entry.projected ? ' (projected)' : ''}`}
                  >
                    <span className="cal-entry-label">
                      {view === 'week' && entry.customer
                        ? `${entry.label} — ${entry.customer}`
                        : entry.label}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="cal-overflow">+{overflow} more</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
