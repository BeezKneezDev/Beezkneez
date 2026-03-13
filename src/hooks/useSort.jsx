import { useState, useMemo } from 'react'

export default function useSort(data, defaultKey = null, defaultAsc = true) {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortAsc, setSortAsc] = useState(defaultAsc)

  function toggleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]

      // Handle nested keys like 'customers.name'
      if (sortKey.includes('.')) {
        const parts = sortKey.split('.')
        valA = parts.reduce((obj, k) => obj?.[k], a)
        valB = parts.reduce((obj, k) => obj?.[k], b)
      }

      if (valA == null) return 1
      if (valB == null) return -1

      // Address sorting: suburb first, then street name, then number
      if (sortKey === 'address') {
        function parseAddress(val) {
          const parts = String(val).split(',').map(s => s.trim())
          // Strip city ("Rotorua") from end if present, suburb is then the last part
          const filtered = parts.filter(p => p.toLowerCase() !== 'rotorua')
          const suburb = (filtered[filtered.length - 1] || '').toLowerCase()
          const street = filtered.slice(0, -1).join(' ').trim().toLowerCase()
          return { suburb, street }
        }
        const a = parseAddress(valA)
        const b = parseAddress(valB)
        if (a.suburb !== b.suburb) {
          return sortAsc ? a.suburb.localeCompare(b.suburb) : b.suburb.localeCompare(a.suburb)
        }
        // Same suburb — sort by street name (strip leading number)
        const nameA = a.street.replace(/^\d+\s*/, '')
        const nameB = b.street.replace(/^\d+\s*/, '')
        if (nameA !== nameB) {
          return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
        }
        // Same street — sort by number
        const numA = parseInt(a.street) || 0
        const numB = parseInt(b.street) || 0
        return sortAsc ? numA - numB : numB - numA
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      if (strA < strB) return sortAsc ? -1 : 1
      if (strA > strB) return sortAsc ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortAsc])

  function SortHeader({ label, field, style }) {
    const isActive = sortKey === field
    return (
      <th
        style={{ cursor: 'pointer', userSelect: 'none', ...style }}
        onClick={() => toggleSort(field)}
      >
        {label} {isActive ? (sortAsc ? '▲' : '▼') : ''}
      </th>
    )
  }

  return { sorted, SortHeader }
}
