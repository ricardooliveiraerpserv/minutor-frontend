'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  FolderOpen,
  Users,
  Search,
  X,
  ChevronDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaginatedResponse<T> {
  items: T[]
  pagination?: { total: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function healthColor(pct: number | undefined): 'green' | 'yellow' | 'red' {
  if (pct == null) return 'green'
  if (pct >= 90) return 'red'
  if (pct >= 70) return 'yellow'
  return 'green'
}

const HS = {
  green:  { bar: '#22c55e', badge: 'rgba(34,197,94,0.12)',  text: '#86efac' },
  yellow: { bar: '#f59e0b', badge: 'rgba(245,158,11,0.12)', text: '#fcd34d' },
  red:    { bar: '#ef4444', badge: 'rgba(239,68,68,0.12)',  text: '#fca5a5' },
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function SearchableSelect({
  value, onChange, placeholder, options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() =>
    options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  )

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQ('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQ('') }}
        className="flex items-center gap-2 pl-3 pr-2 py-2 text-sm rounded-lg outline-none cursor-pointer whitespace-nowrap"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--brand-border)',
          color: value ? 'var(--brand-text)' : 'var(--brand-subtle)',
          minWidth: 160,
        }}
      >
        <span className="flex-1 text-left truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={12} style={{ color: 'var(--brand-subtle)', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{
            background: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.10)',
            minWidth: 220,
            maxWidth: 320,
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-subtle)' }} />
              <input
                autoFocus
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand-text)' }}
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
              style={{ color: value === '' ? '#00F5FF' : 'var(--brand-muted)' }}
            >
              {placeholder}
            </button>
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
                style={{ color: value === o.value ? '#00F5FF' : 'var(--brand-text)' }}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--brand-subtle)' }}>Nenhum resultado</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-3 text-sm shadow-lg"
      style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.10)', color: '#E4E4E7' }}
    >
      <p className="font-semibold mb-1.5" style={{ color: '#A1A1AA' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="tabular-nums" style={{ color: p.stroke }}>
          {p.name}: <strong>{fmt(p.value ?? 0)}</strong>
          {p.dataKey === 'hours' ? 'h' : ''}
        </p>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

// ── Cache helpers (sessionStorage, TTL 5 min) ────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000

function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null }
    return data as T
  } catch { return null }
}

function cacheSet(key: string, data: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export default function IndicadoresPage() {
  const { user } = useAuth()
  const router = useRouter()

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const EXCLUDED = ['sustentacao']

  // ── Data state ──
  const [projects, setProjects] = useState<any[]>(() => cacheGet<any[]>('ind_projects') ?? [])
  const [teamProjects, setTeamProjects] = useState<any[]>(() => cacheGet<any[]>('ind_team') ?? [])
  const [pendingTs, setPendingTs] = useState(0)
  const [pendingExp, setPendingExp] = useState(0)
  const [monthlyData, setMonthlyData] = useState<any[] | null>(() => cacheGet<any[]>('ind_chart'))
  const [loading, setLoading] = useState(() => cacheGet('ind_projects') === null)
  const [chartLoading, setChartLoading] = useState(() => cacheGet('ind_chart') === null)
  const [teamLoading, setTeamLoading] = useState(() => cacheGet('ind_team') === null)

  // ── Filter state ──
  const [clienteFilter, setClienteFilter] = useState('')
  const [projetoFilter, setProjetoFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [executivoFilter, setExecutivoFilter] = useState('')

  // ── Fetch data ──
  useEffect(() => {
    let cancelled = false

    const CHART_URLS = [
      '/dashboards/bank-hours-fixed/indicators/monthly-consumption',
      '/dashboards/bank-hours-monthly/indicators/monthly-consumption',
      '/dashboards/on-demand/indicators/monthly-consumption',
    ]

    // Dispara TUDO em paralelo — projetos (sem equipe = rápido), aprovações e gráfico ao mesmo tempo
    const projPromise   = api.get<PaginatedResponse<any>>('/projects?pageSize=300&gestao=true&with_team=false')
    const tsPromise     = api.get<any>('/approvals/timesheets?per_page=1&status=pending')
    const expPromise    = api.get<any>('/approvals/expenses?per_page=1&status=pending')
    const chartPromises = CHART_URLS.map(url => api.get<any>(url))

    // Projetos + aprovações (carga rápida: sem consultants/coordinators)
    Promise.allSettled([projPromise, tsPromise, expPromise]).then(([projRes, tsRes, expRes]) => {
      if (cancelled) return
      if (projRes.status === 'fulfilled') {
        const items = (projRes.value?.items ?? []).filter(
          (p: any) => !EXCLUDED.includes(normalize(p.contract_type_display ?? ''))
        )
        setProjects(items)
        cacheSet('ind_projects', items)
      }
      if (tsRes.status === 'fulfilled') {
        const d = tsRes.value
        setPendingTs(d?.pagination?.total ?? d?.meta?.total ?? d?.total ?? 0)
      }
      if (expRes.status === 'fulfilled') {
        const d = expRes.value
        setPendingExp(d?.pagination?.total ?? d?.meta?.total ?? d?.total ?? 0)
      }
      setLoading(false)

      // Após projetos carregarem, busca equipe em background
      if (!cancelled) {
        api.get<PaginatedResponse<any>>('/projects?pageSize=300&gestao=true')
          .then(res => {
            if (!cancelled) {
              const items = (res?.items ?? []).filter(
                (p: any) => !EXCLUDED.includes(normalize(p.contract_type_display ?? ''))
              )
              setTeamProjects(items)
              cacheSet('ind_team', items)
            }
          })
          .catch(() => {})
          .finally(() => { if (!cancelled) setTeamLoading(false) })
      }
    })

    // Gráfico em paralelo — não espera projetos
    Promise.allSettled(chartPromises).then(results => {
      if (cancelled) return
      const map = new Map<string, number>()
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        const arr: any[] = Array.isArray(r.value) ? r.value : r.value?.data ?? []
        for (const d of arr) {
          const month = d.month ?? ''
          const h = Number(d.consumed_hours ?? d.hours ?? 0)
          map.set(month, (map.get(month) ?? 0) + h)
        }
      }
      if (map.size > 0) {
        const sorted = [...map.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, hours]) => ({ month, hours: Math.round(hours * 10) / 10 }))
        setMonthlyData(sorted)
        cacheSet('ind_chart', sorted)
      } else {
        setMonthlyData(null)
      }
      setChartLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  // ── Derived filter options ──
  const clientes = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of projects) {
      if (p.customer?.id && p.customer?.name) map.set(String(p.customer.id), p.customer.name)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [projects])

  const contractTypes = useMemo(() => {
    const set = new Set<string>()
    for (const p of projects) if (p.contract_type_display) set.add(p.contract_type_display)
    return Array.from(set).sort()
  }, [projects])

  const projetoOptions = useMemo(() =>
    projects
      .map(p => ({ value: String(p.id), label: `${p.code ? `[${p.code}] ` : ''}${p.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [projects]
  )

  const clienteOptions = useMemo(() =>
    clientes.map(([id, name]) => ({ value: id, label: name })),
    [clientes]
  )

  const executivos = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of projects) {
      for (const c of p.coordinators ?? []) {
        if (c.id && c.name) map.set(c.id, c.name)
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [projects])

  const executivoOptions = useMemo(() =>
    executivos.map(([id, name]) => ({ value: String(id), label: name })),
    [executivos]
  )

  const STATUS_LABELS: Record<string, string> = {
    active: 'Ativo',
    awaiting_start: 'Aguardando início',
    started: 'Iniciado',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    finished: 'Finalizado',
  }

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

  const hasFilter = clienteFilter !== '' || projetoFilter !== '' || contractFilter !== '' || statusFilter !== '' || executivoFilter !== ''

  // ── Filtered projects ──
  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (clienteFilter && String(p.customer?.id) !== clienteFilter) return false
      if (projetoFilter && String(p.id) !== projetoFilter) return false
      if (contractFilter && p.contract_type_display !== contractFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (executivoFilter) {
        const hasExec = (p.coordinators ?? []).some((c: any) => String(c.id) === executivoFilter)
        if (!hasExec) return false
      }
      return true
    })
  }, [projects, clienteFilter, projetoFilter, contractFilter, statusFilter, executivoFilter])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const saldoTotal = filtered.reduce((acc, p) => acc + (p.general_hours_balance ?? 0), 0)
    const withHours = filtered.filter(p => (p.sold_hours ?? 0) > 0)
    const consumoMedio = withHours.length
      ? withHours.reduce((acc, p) => acc + (p.balance_percentage ?? 0), 0) / withHours.length
      : 0
    const emRisco = filtered.filter(p => (p.balance_percentage ?? 0) >= 90).length
    return { saldoTotal, consumoMedio, emRisco, totalProjetos: filtered.length }
  }, [filtered])

  // ── Alerts ──
  const alerts = useMemo(() => {
    const list: { type: 'red' | 'yellow'; icon: 'alert' | 'warning' | 'clock' | 'receipt'; title: string; msg: string; href: string | null; projectId?: number }[] = []

    for (const p of filtered) {
      if ((p.general_hours_balance ?? 0) < 0) {
        list.push({ type: 'red', icon: 'alert', title: p.name, msg: `Saldo negativo (${Math.round(p.general_hours_balance ?? 0)}h)`, href: null, projectId: p.id })
      } else if ((p.balance_percentage ?? 0) >= 90) {
        list.push({ type: 'red', icon: 'alert', title: p.name, msg: `${Math.round(p.balance_percentage ?? 0)}% consumido — risco crítico`, href: null, projectId: p.id })
      }
    }

    for (const p of filtered) {
      const pct = p.balance_percentage ?? 0
      if (pct >= 70 && pct < 90 && (p.general_hours_balance ?? 0) >= 0) {
        list.push({ type: 'yellow', icon: 'warning', title: p.name, msg: `${Math.round(pct)}% consumido — atenção`, href: null, projectId: p.id })
      }
    }

    if (pendingTs > 0) {
      list.push({ type: 'yellow', icon: 'clock', title: 'Apontamentos pendentes', msg: `${pendingTs} apontamento(s) aguardando aprovação`, href: '/approvals' })
    }
    if (pendingExp > 0) {
      list.push({ type: 'yellow', icon: 'receipt', title: 'Despesas pendentes', msg: `${pendingExp} despesa(s) aguardando aprovação`, href: '/approvals' })
    }

    return list
  }, [filtered, pendingTs, pendingExp])

  // ── Critical projects sorted ──
  const criticalProjects = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (a.general_hours_balance ?? 0) - (b.general_hours_balance ?? 0))
      .slice(0, 20)
  }, [filtered])

  // ── Consultants — usa teamProjects (carregados em background com equipe) ──
  const consultants = useMemo(() => {
    const map = new Map<number, { id: number; name: string; projects: number; role: string }>()
    // Filtra teamProjects com os mesmos critérios de search/cliente/contrato
    const teamFiltered = teamProjects.filter(p => {
      if (clienteFilter && String(p.customer?.id) !== clienteFilter) return false
      if (projetoFilter && String(p.id) !== projetoFilter) return false
      if (contractFilter && p.contract_type_display !== contractFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (executivoFilter) {
        const hasExec = (p.coordinators ?? []).some((c: any) => String(c.id) === executivoFilter)
        if (!hasExec) return false
      }
      return true
    })
    for (const p of teamFiltered) {
      for (const c of [...(p.consultants ?? []), ...(p.coordinators ?? [])]) {
        if (!map.has(c.id)) map.set(c.id, { id: c.id, name: c.name, projects: 0, role: p.coordinators?.some((co: any) => co.id === c.id) ? 'Coordenador' : 'Consultor' })
        map.get(c.id)!.projects++
      }
    }
    return Array.from(map.values()).sort((a, b) => b.projects - a.projects)
  }, [teamProjects, clienteFilter, projetoFilter, contractFilter, statusFilter, executivoFilter])

  // ── Chart KPIs ──
  const chartKpis = useMemo(() => {
    if (!monthlyData?.length) return null
    const hours = monthlyData.map(d => d.hours ?? 0)
    const mediaHoras = hours.reduce((a, b) => a + b, 0) / hours.length
    const mesesComDados = hours.filter(h => h > 0).length
    let tendencia = '—'
    if (hours.length >= 6) {
      const last3 = hours.slice(-3).reduce((a, b) => a + b, 0) / 3
      const prev3 = hours.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
      if (prev3 > 0) {
        const diff = ((last3 - prev3) / prev3) * 100
        tendencia = (diff >= 0 ? '+' : '') + fmt(diff) + '%'
      }
    }
    return { mediaHoras, mesesComDados, tendencia }
  }, [monthlyData])

  const hasRevenue = monthlyData?.some(d => d.revenue != null)
  const hasExpenses = monthlyData?.some(d => d.expenses != null)

  // ─────────────────────────────────────────────────────────────────────────────

  function AlertIcon({ icon }: { icon: string }) {
    if (icon === 'clock') return <Clock size={16} />
    if (icon === 'receipt') return <FolderOpen size={16} />
    if (icon === 'warning') return <AlertTriangle size={16} />
    return <AlertTriangle size={16} />
  }

  // ── Render ──
  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,245,255,0.12)' }}
            >
              <TrendingUp size={20} style={{ color: '#00F5FF' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Indicadores de Gestão</h1>
              <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                Visão consolidada dos projetos e alertas operacionais
              </p>
            </div>
          </div>

          {/* ── Contract type tabs ── */}
          <div
            className="flex items-center gap-1 p-1.5 rounded-2xl overflow-x-auto"
            style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)' }}
          >
            {(['', ...contractTypes] as string[]).map(ct => {
              const active = contractFilter === ct
              const label = ct === '' ? 'Todos' : ct
              return (
                <button
                  key={ct}
                  onClick={() => setContractFilter(ct)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                  style={active
                    ? { background: '#00F5FF', color: '#0A0A0B' }
                    : { color: 'var(--brand-muted)', background: 'transparent' }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* ── Row filters ── */}
          <div
            className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border"
            style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <SearchableSelect
              value={clienteFilter}
              onChange={setClienteFilter}
              placeholder="Todos os clientes"
              options={clienteOptions}
            />
            <SearchableSelect
              value={projetoFilter}
              onChange={setProjetoFilter}
              placeholder="Todos os projetos"
              options={projetoOptions}
            />
            <SearchableSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Todos os status"
              options={statusOptions}
            />
            <SearchableSelect
              value={executivoFilter}
              onChange={setExecutivoFilter}
              placeholder="Todos os executivos"
              options={executivoOptions}
            />
            {hasFilter && (
              <button
                onClick={() => { setClienteFilter(''); setProjetoFilter(''); setContractFilter(''); setStatusFilter(''); setExecutivoFilter('') }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--brand-muted)' }}
              >
                <X size={13} />
                Limpar
              </button>
            )}
          </div>

          {/* ── Section 1: KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (
              <>
                {/* Saldo Total */}
                <div
                  className="rounded-2xl p-5 border"
                  style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--brand-subtle)' }}>
                    Saldo Total
                  </p>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: kpis.saldoTotal < 0 ? '#ef4444' : '#00F5FF' }}
                  >
                    {kpis.saldoTotal < 0 ? '−' : ''}{fmt(Math.abs(kpis.saldoTotal))}h
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                    {filtered.length} projeto(s) filtrado(s)
                  </p>
                </div>

                {/* Consumo Médio */}
                <div
                  className="rounded-2xl p-5 border"
                  style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--brand-subtle)' }}>
                    Consumo Médio
                  </p>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: HS[healthColor(kpis.consumoMedio)].text }}
                  >
                    {fmt(kpis.consumoMedio)}%
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                    Média das horas consumidas
                  </p>
                </div>

                {/* Projetos em Risco */}
                <div
                  className="rounded-2xl p-5 border"
                  style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--brand-subtle)' }}>
                    Projetos em Risco
                  </p>
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: kpis.emRisco > 0 ? '#ef4444' : '#22c55e' }}
                  >
                    {kpis.emRisco}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                    {kpis.emRisco > 0 ? '≥ 90% consumido' : 'Nenhum em risco crítico'}
                  </p>
                </div>

                {/* Total de Projetos */}
                <div
                  className="rounded-2xl p-5 border"
                  style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--brand-subtle)' }}>
                    Total de Projetos
                  </p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: '#00F5FF' }}>
                    {kpis.totalProjetos}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                    Projetos ativos
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── Section 2: Alertas ── */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-text)' }}>
              Alertas Operacionais
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex items-center gap-2.5 py-4" style={{ color: '#22c55e' }}>
                <CheckCircle size={18} />
                <span className="text-sm font-medium">Nenhum alerta no momento</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {alerts.map((a, i) => {
                  const borderColor = a.type === 'red' ? '#ef4444' : '#f59e0b'
                  const bgIdle = a.type === 'red' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)'
                  const bgHover = a.type === 'red' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
                  const iconColor = a.type === 'red' ? '#fca5a5' : '#fcd34d'

                  const handleClick = () => {
                    if (a.href) { router.push(a.href); return }
                    if (a.projectId) { setProjetoFilter(String(a.projectId)) }
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={handleClick}
                      className="flex items-start gap-3 rounded-xl p-3 pl-4 w-full text-left transition-all group"
                      style={{
                        borderLeft: `4px solid ${borderColor}`,
                        background: bgIdle,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = bgIdle)}
                    >
                      <span className="mt-0.5 shrink-0" style={{ color: iconColor }}>
                        <AlertIcon icon={a.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--brand-text)' }}>
                          {a.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--brand-muted)' }}>
                          {a.msg}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Section 3: Gráfico Evolução 12 Meses ── */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-text)' }}>
              Evolução Mensal
            </h2>

            {chartLoading ? (
              <Skeleton className="h-60" />
            ) : !monthlyData || monthlyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <TrendingUp size={32} style={{ color: 'var(--brand-subtle)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--brand-muted)' }}>Dados históricos em breve</p>
                <p className="text-xs" style={{ color: 'var(--brand-subtle)' }}>
                  Os dados de evolução mensal ainda não estão disponíveis
                </p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Chart */}
                <div className="flex-1 min-w-0">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#71717A' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="hours"
                        name="Horas"
                        stroke="#00F5FF"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#00F5FF' }}
                      />
                      {hasRevenue && (
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Receita"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#22c55e' }}
                        />
                      )}
                      {hasExpenses && (
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          name="Despesas"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#ef4444' }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart KPIs */}
                {chartKpis && (
                  <div className="flex lg:flex-col gap-3 lg:w-40 shrink-0">
                    <div
                      className="flex-1 lg:flex-none rounded-xl p-3 border"
                      style={{ borderColor: 'var(--brand-border)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--brand-subtle)' }}>
                        Média mensal
                      </p>
                      <p className="text-lg font-bold tabular-nums" style={{ color: '#00F5FF' }}>
                        {fmt(chartKpis.mediaHoras)}h
                      </p>
                    </div>
                    <div
                      className="flex-1 lg:flex-none rounded-xl p-3 border"
                      style={{ borderColor: 'var(--brand-border)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--brand-subtle)' }}>
                        Meses c/ dados
                      </p>
                      <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand-text)' }}>
                        {chartKpis.mesesComDados}
                      </p>
                    </div>
                    <div
                      className="flex-1 lg:flex-none rounded-xl p-3 border"
                      style={{ borderColor: 'var(--brand-border)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--brand-subtle)' }}>
                        Tendência
                      </p>
                      <p
                        className="text-lg font-bold tabular-nums"
                        style={{
                          color: chartKpis.tendencia.startsWith('+')
                            ? '#22c55e'
                            : chartKpis.tendencia.startsWith('-')
                            ? '#ef4444'
                            : 'var(--brand-muted)',
                        }}
                      >
                        {chartKpis.tendencia}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Section 4: Projetos Críticos ── */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>
                Projetos Críticos
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--brand-subtle)' }}>
                Top 20 por menor saldo de horas
              </p>
            </div>

            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : criticalProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <FolderOpen size={28} style={{ color: 'var(--brand-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>Nenhum projeto encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--brand-border)' }}>
                      {['Projeto', 'Cliente', 'Tipo', 'Saldo', '% Uso', 'Status'].map(col => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--brand-subtle)' }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criticalProjects.map((p, i) => {
                      const pct = p.balance_percentage ?? 0
                      const bal = p.general_hours_balance ?? 0
                      const isCritical = pct >= 90 || bal < 0
                      const isWarning = pct >= 70 && !isCritical
                      const hc = healthColor(pct)

                      return (
                        <tr
                          key={p.id ?? i}
                          style={{
                            borderBottom: i < criticalProjects.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            borderLeft: isCritical
                              ? '3px solid #ef4444'
                              : isWarning
                              ? '3px solid #f59e0b'
                              : '3px solid transparent',
                            background: isCritical
                              ? 'rgba(239,68,68,0.03)'
                              : isWarning
                              ? 'rgba(245,158,11,0.03)'
                              : 'transparent',
                          }}
                        >
                          <td className="px-4 py-3 font-medium max-w-[180px] truncate" style={{ color: 'var(--brand-text)' }}>
                            {p.name ?? '—'}
                            {p.code && (
                              <span className="ml-1.5 text-xs" style={{ color: 'var(--brand-subtle)' }}>
                                {p.code}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[140px] truncate" style={{ color: 'var(--brand-muted)' }}>
                            {p.customer?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--brand-muted)' }}>
                            {p.contract_type_display ?? '—'}
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap font-medium">
                            <span style={{ color: bal < 0 ? '#ef4444' : bal >= 20 ? '#86efac' : 'var(--brand-muted)' }}>
                              {bal < 0 ? '−' : ''}{fmt(Math.abs(bal))}h
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: HS[hc].badge, color: HS[hc].text }}
                            >
                              {fmt(pct)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.status_display ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--brand-muted)' }}
                              >
                                {p.status_display}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Section 5: Performance da Equipe ── */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: 'var(--brand-muted)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>
                  Performance da Equipe
                </h2>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--brand-subtle)' }}>
                Dados estimados — horas reais por consultor requerem endpoint dedicado
              </p>
            </div>

            {teamLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : consultants.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Users size={28} style={{ color: 'var(--brand-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                  Nenhum consultor encontrado nos projetos filtrados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--brand-border)' }}>
                      {['Membro', 'Papel', 'Projetos', 'Status'].map(col => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--brand-subtle)' }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consultants.map((c, i) => (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: i < consultants.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--brand-text)' }}>
                          {c.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: 'var(--brand-subtle)' }}>{c.role}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--brand-muted)' }}>
                          {c.projects}
                        </td>
                        <td className="px-4 py-3">
                          {c.projects > 0 ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: 'rgba(34,197,94,0.12)', color: '#86efac' }}
                            >
                              Ativo
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand-subtle)' }}
                            >
                              Sem projetos
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
