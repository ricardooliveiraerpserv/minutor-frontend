'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertTriangle, TrendingUp, Clock, Users, ChevronDown,
  FileText, CheckCircle, X, Search, ChevronRight,
  BarChart2, CalendarClock, Zap, Layers,
} from 'lucide-react'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalData {
  customer: { id: number; name: string }
  period: string
  overview: {
    balance_hours: number
    consumption_pct: number
    investment: number
    status: 'ok' | 'warning' | 'critical'
    total_sold: number
    total_consumed: number
    month_consumed: number
    prev_consumed: number
    trend_pct: number
    trend_dir: 'up' | 'down' | 'stable'
    avg_monthly: number
    avg_weekly: number
    weeks_remaining: number | null
    filter_month: number
    filter_year: number
  }
  monthly_chart: { month: string; label: string; consumed_hours: number }[]
  contracts: ContractGroup[]
  projects: PortalProject[]
  support: SupportData
  alerts: PortalAlert[]
}

interface ContractGroup {
  contract_type: string
  sold_hours: number
  consumed_hours: number
  balance_hours: number
  consumption_pct: number
  project_count: number
  status: 'ok' | 'warning' | 'critical'
}

interface PortalProject {
  id: number
  name: string
  code: string
  status_display: string
  sold_hours: number
  consumed_hours: number
  balance_hours: number
  consumption_pct: number
  health: 'ok' | 'warning' | 'critical'
  contract_type: string
  is_sustentacao: boolean
  children: PortalProject[]
}

interface SupportData {
  open_tickets: number
  resolved_tickets: number
  total_tickets: number
  consumed_hours: number
  avg_hours_ticket: number
  monthly_tickets: { month: string; count: number }[]
}

interface PortalAlert {
  type: 'critical' | 'warning'
  icon: string
  title: string
  message: string
  project_id?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HC = {
  ok:       { bar: '#22c55e', text: '#86efac', bg: 'rgba(34,197,94,0.10)',   border: '#22c55e' },
  warning:  { bar: '#f59e0b', text: '#fcd34d', bg: 'rgba(245,158,11,0.10)', border: '#f59e0b' },
  critical: { bar: '#ef4444', text: '#fca5a5', bg: 'rgba(239,68,68,0.10)',  border: '#ef4444' },
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fmtR = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const STATUS_LABEL: Record<string, string> = {
  ok: 'Saudável', warning: 'Atenção', critical: 'Crítico',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: 'rgba(255,255,255,0.06)' }} />
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const c = HC[status as keyof typeof HC] ?? HC.ok
  return (
    <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? HC.critical.bar : c.bar }}
      />
    </div>
  )
}

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function SearchableSelect({ value, onChange, placeholder, options }: {
  value: string; onChange: (v: string) => void
  placeholder: string; options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())), [options, q])
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ('') }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setQ('') }}
        className="flex items-center gap-2 pl-4 pr-3 py-2.5 text-sm rounded-xl outline-none cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--brand-border)',
          color: value ? 'var(--brand-text)' : 'var(--brand-subtle)', minWidth: 200,
        }}
      >
        <span className="flex-1 text-left truncate font-medium">{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} style={{ color: 'var(--brand-subtle)', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.10)', minWidth: 240 }}>
          <div className="p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-subtle)' }} />
              <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
                placeholder="Buscar..." className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--brand-text)' }} />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
              style={{ color: value === '' ? '#00F5FF' : 'var(--brand-muted)' }}>
              {placeholder}
            </button>
            {filtered.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setQ('') }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
                style={{ color: value === o.value ? '#00F5FF' : 'var(--brand-text)' }}>
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--brand-subtle)' }}>Nenhum resultado</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'all',     label: 'Todo o período' },
  { value: 'month',   label: 'Este mês' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year',    label: 'Este ano' },
]

export default function PortalClientePage() {
  const { user } = useAuth()
  const isCliente = user?.type === 'cliente'

  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([])
  const [customerId, setCustomerId] = useState('')
  const [period, setPeriod] = useState('all')
  const [filterMonth, setFilterMonth] = useState<number | null>(new Date().getMonth() + 1)
  const [filterYear, setFilterYear]   = useState<number | null>(new Date().getFullYear())
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [projectFilter, setProjectFilter] = useState<number | null>(null)

  // Para cliente: usa o customer_id do próprio usuário automaticamente
  useEffect(() => {
    if (isCliente && user?.customer_id) {
      setCustomerId(String(user.customer_id))
    }
  }, [isCliente, user?.customer_id])

  // Para admin/coordenador: carrega lista de clientes
  useEffect(() => {
    if (isCliente) return
    api.get<any[]>('/client/portal/customers')
      .then(res => setCustomers((res ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))))
      .catch(() => {})
  }, [isCliente])

  // Load portal data when customer or period changes
  useEffect(() => {
    if (!customerId) { setData(null); return }
    setLoading(true)
    const qs = new URLSearchParams({ customer_id: customerId, period })
    if (filterMonth && filterYear) { qs.set('filter_month', String(filterMonth)); qs.set('filter_year', String(filterYear)) }
    api.get<PortalData>(`/client/portal?${qs}`)
      .then(res => {
        setData(res)
        // Salva dashboards disponíveis para sidebar dinâmica
        if (res?.contracts) {
          const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const types = res.contracts.map((c: any) => nrm(c.contract_type))
          const available: string[] = []
          if (types.some((t: string) => t.includes('fixo'))) available.push('bank-hours-fixed')
          if (types.some((t: string) => t.includes('mensal'))) available.push('bank-hours-monthly')
          if (types.some((t: string) => t.includes('demand'))) available.push('on-demand')
          try { sessionStorage.setItem('client_dashboards', JSON.stringify(available)) } catch {}
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [customerId, period, filterMonth, filterYear])

  // Reset project filter when customer or data changes
  useEffect(() => { setProjectFilter(null) }, [customerId])

  const toggleProject = (id: number) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const d = data

  // ── Dashboards disponíveis baseados nos tipos de contrato do cliente ──
  const CONTRACT_TO_DASH = [
    { keys: ['banco de horas fixo', 'fixo'],   label: 'Banco de Horas Fixo',    href: '/dashboards/bank-hours-fixed',   icon: BarChart2, color: '#00F5FF' },
    { keys: ['banco de horas mensal', 'mensal'],label: 'Banco de Horas Mensal',   href: '/dashboards/bank-hours-monthly', icon: CalendarClock, color: '#a78bfa' },
    { keys: ['on demand', 'demand'],            label: 'On Demand',               href: '/dashboards/on-demand',          icon: Zap, color: '#f59e0b' },
  ]

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const availableDashboards = useMemo(() => {
    if (!d?.contracts?.length) return []
    const clientTypes = d.contracts.map(c => normalize(c.contract_type))
    return CONTRACT_TO_DASH.filter(dash =>
      dash.keys.some(k => clientTypes.some(t => t.includes(k)))
    )
  }, [d?.contracts])

  const hasMultiContract = useMemo(() =>
    (d?.projects ?? []).some(p => p.children.length > 0),
    [d?.projects]
  )

  const projectOptions = useMemo(() => {
    const opts: { value: number; label: string }[] = []
    ;(d?.projects ?? []).filter(p => !p.is_sustentacao).forEach(p => {
      opts.push({ value: p.id, label: p.name })
      p.children.forEach(c => opts.push({ value: c.id, label: `↳ ${c.name}` }))
    })
    return opts
  }, [d?.projects])

  // Projeto selecionado para KPIs específicos
  const selectedProject = useMemo(() => {
    if (!projectFilter || !d) return null
    const allP = d.projects.filter(p => !p.is_sustentacao)
    // pai direto
    const parent = allP.find(p => p.id === projectFilter)
    if (parent) return parent
    // filho
    for (const p of allP) {
      const child = p.children.find(c => c.id === projectFilter)
      if (child) return child
    }
    return null
  }, [projectFilter, d])

  // Auto-expande o pai quando um projeto filho é selecionado no filtro
  useEffect(() => {
    if (!projectFilter || !d) return
    const all = (d.projects ?? []).filter(p => !p.is_sustentacao)
    const isParent = all.some(p => p.id === projectFilter)
    if (!isParent) {
      const parent = all.find(p => p.children.some(c => c.id === projectFilter))
      if (parent) setExpandedProjects(new Set([parent.id]))
    }
  }, [projectFilter, d])

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,245,255,0.12)' }}>
                <Users size={20} style={{ color: '#00F5FF' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {d?.customer?.name ?? 'Visão Executiva'}
                </h1>
                <p className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                  Visão Executiva · consumo, tendência e saúde do contrato
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isCliente && (
                <SearchableSelect
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Selecionar cliente..."
                  options={customers}
                />
              )}
              <MonthYearPicker
                month={filterMonth}
                year={filterYear}
                placeholder="Mês p/ consumo"
                onChange={(m, y) => {
                  if (m === 0 && y === 0) { setFilterMonth(null); setFilterYear(null) }
                  else { setFilterMonth(m); setFilterYear(y) }
                }}
              />
              {projectOptions.length > 0 && (
                <div className="relative">
                  <select
                    value={projectFilter ?? ''}
                    onChange={e => setProjectFilter(e.target.value ? Number(e.target.value) : null)}
                    className="appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl outline-none cursor-pointer font-medium"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--brand-border)', color: projectFilter ? 'var(--brand-primary)' : 'var(--brand-text)' }}
                  >
                    <option value="" style={{ background: '#161618' }}>Todos os projetos</option>
                    {projectOptions.map(p => (
                      <option key={p.value} value={p.value} style={{ background: '#161618' }}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--brand-subtle)' }} />
                </div>
              )}
              <div className="relative">
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl outline-none cursor-pointer font-medium"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
                >
                  {PERIODS.map(p => <option key={p.value} value={p.value} style={{ background: '#161618' }}>{p.label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--brand-subtle)' }} />
              </div>
            </div>
          </div>

          {/* ── Empty state ── */}
          {!customerId && !isCliente && (
            <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border"
              style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
              <Users size={40} style={{ color: 'var(--brand-subtle)' }} />
              <p className="text-base font-semibold" style={{ color: 'var(--brand-muted)' }}>
                Selecione um cliente para visualizar o portal
              </p>
            </div>
          )}

          {customerId && (
            <>
              {/* ── 1. KPIs ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />) : d ? (<>
                  {selectedProject ? (
                    /* ── KPIs por projeto ── */
                    <>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Saldo Restante</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: selectedProject.balance_hours < 0 ? HC.critical.text : '#00F5FF' }}>
                          {selectedProject.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(selectedProject.balance_hours))}h
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>de {fmt(selectedProject.sold_hours)}h contratadas</p>
                      </div>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Consumo Total</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: HC[selectedProject.health]?.text ?? HC.ok.text }}>
                          {fmt(selectedProject.consumption_pct)}%
                        </p>
                        <ProgressBar pct={selectedProject.consumption_pct} status={selectedProject.health} />
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                          {fmt(selectedProject.consumed_hours)}h de {fmt(selectedProject.sold_hours)}h utilizadas
                        </p>
                      </div>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'rgba(0,245,255,0.18)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Horas Consumidas</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: '#00F5FF' }}>
                          {fmt(selectedProject.consumed_hours)}h
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>total apontado no projeto</p>
                      </div>
                      <div className="rounded-2xl p-5 border"
                        style={{ background: 'var(--brand-surface)', borderColor: HC[selectedProject.health]?.border ?? 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Saúde do Projeto</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: HC[selectedProject.health]?.bar ?? HC.ok.bar }} />
                          <p className="text-xl font-bold" style={{ color: HC[selectedProject.health]?.text ?? HC.ok.text }}>
                            {STATUS_LABEL[selectedProject.health] ?? '—'}
                          </p>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--brand-subtle)' }}>
                          Saldo: <strong style={{ color: 'var(--brand-muted)' }}>{selectedProject.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(selectedProject.balance_hours))}h</strong>
                        </p>
                      </div>
                    </>
                  ) : (
                    /* ── KPIs globais ── */
                    <>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Saldo Restante</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: d.overview.balance_hours < 0 ? HC.critical.text : '#00F5FF' }}>
                          {d.overview.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(d.overview.balance_hours))}h
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>de {fmt(d.overview.total_sold)}h contratadas</p>
                      </div>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Consumo Total</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: HC[d.overview.status]?.text ?? HC.ok.text }}>
                          {fmt(d.overview.consumption_pct)}%
                        </p>
                        <ProgressBar pct={d.overview.consumption_pct} status={d.overview.status} />
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                          {fmt(d.overview.total_consumed)}h de {fmt(d.overview.total_sold)}h utilizadas
                        </p>
                      </div>
                      <div className="rounded-2xl p-5 border" style={{ background: 'var(--brand-surface)', borderColor: 'rgba(0,245,255,0.18)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-subtle)' }}>Uso no Mês</p>
                          {d.overview.trend_dir !== 'stable' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: d.overview.trend_dir === 'up' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                color: d.overview.trend_dir === 'up' ? '#fca5a5' : '#86efac',
                              }}>
                              {d.overview.trend_dir === 'up' ? '▲' : '▼'} {Math.abs(d.overview.trend_pct)}% vs mês ant.
                            </span>
                          )}
                        </div>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: '#00F5FF' }}>
                          {fmt(d.overview.month_consumed)}h
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--brand-subtle)' }}>
                          {d.overview.month_consumed > d.overview.avg_monthly
                            ? `▲ acima da média (${fmt(d.overview.avg_monthly)}h/mês)`
                            : `▼ abaixo da média (${fmt(d.overview.avg_monthly)}h/mês)`}
                        </p>
                      </div>
                      <div className="rounded-2xl p-5 border"
                        style={{ background: 'var(--brand-surface)', borderColor: HC[d.overview.status]?.border ?? 'var(--brand-border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>Saúde do Contrato</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: HC[d.overview.status]?.bar ?? HC.ok.bar }} />
                          <p className="text-xl font-bold" style={{ color: HC[d.overview.status]?.text ?? HC.ok.text }}>
                            {STATUS_LABEL[d.overview.status] ?? '—'}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs" style={{ color: 'var(--brand-subtle)' }}>
                            Saldo: <strong style={{ color: 'var(--brand-muted)' }}>{d.overview.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(d.overview.balance_hours))}h</strong>
                          </p>
                          <p className="text-xs" style={{ color: 'var(--brand-subtle)' }}>
                            Ritmo: <strong style={{ color: 'var(--brand-muted)' }}>{fmt(d.overview.avg_weekly ?? 0)}h/semana</strong>
                          </p>
                          <p className="text-xs font-semibold" style={{ color: HC[d.overview.status]?.text ?? HC.ok.text }}>
                            {d.overview.weeks_remaining !== null
                              ? `→ ~${d.overview.weeks_remaining} semanas restantes`
                              : '→ saldo esgotado'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </>) : null}
              </div>

              {/* ── 1b. Gráfico de consumo mensal ── */}
              {!loading && d && d.monthly_chart?.length > 0 && (() => {
                const avg = d.overview.avg_monthly
                const lastEntry = d.monthly_chart[d.monthly_chart.length - 1]
                const prevEntry = d.monthly_chart[d.monthly_chart.length - 2]
                const varPct = prevEntry?.consumed_hours > 0
                  ? Math.round(((lastEntry.consumed_hours - prevEntry.consumed_hours) / prevEntry.consumed_hours) * 100)
                  : null
                return (
                  <div className="rounded-2xl border p-5" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>Evolução de Consumo</h2>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--brand-subtle)' }}>
                        <span className="flex items-center gap-1">
                          <span className="w-6 border-t border-dashed" style={{ borderColor: 'rgba(0,245,255,0.4)' }} />
                          média {fmt(avg)}h
                        </span>
                        {varPct !== null && (
                          <span className="font-semibold"
                            style={{ color: varPct > 0 ? '#fca5a5' : '#86efac' }}>
                            {varPct > 0 ? '▲' : '▼'} {Math.abs(varPct)}% vs mês ant.
                          </span>
                        )}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={d.monthly_chart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#00F5FF" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, color: '#E5E7EB' }}
                          formatter={(v: any) => [`${fmt(v)}h`, 'Consumo']}
                        />
                        <ReferenceLine y={avg} stroke="rgba(0,245,255,0.35)" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="consumed_hours" stroke="#00F5FF" strokeWidth={2} fill="url(#chartGrad)"
                          dot={(props: any) => {
                            const isLast = props.index === d.monthly_chart.length - 1
                            return <circle cx={props.cx} cy={props.cy} r={isLast ? 5 : 3}
                              fill={isLast ? '#00F5FF' : '#00F5FF'} stroke={isLast ? '#0A0A0B' : 'none'} strokeWidth={isLast ? 2 : 0} />
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}

              {/* ── 2. Alertas ── */}
              {!loading && d && d.alerts.length > 0 && (
                <div className="rounded-2xl border p-5" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                  <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-text)' }}>Alertas</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {d.alerts.map((a, i) => {
                      const c = a.type === 'critical' ? HC.critical : HC.warning
                      return (
                        <div key={i}
                          className="flex items-start gap-3 rounded-xl p-3 pl-4"
                          style={{ borderLeft: `4px solid ${c.border}`, background: c.bg }}>
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: c.text }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>{a.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--brand-muted)' }}>{a.message}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── 4. Projetos ── */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>Projetos</h2>
                </div>
                {loading ? (
                  <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : d && (() => {
                    const allP = d.projects.filter(p => !p.is_sustentacao)
                    if (!projectFilter) return allP.length > 0
                    const isPar = allP.some(p => p.id === projectFilter)
                    return isPar ? allP.some(p => p.id === projectFilter) : allP.some(p => p.children.some(c => c.id === projectFilter))
                  })() ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--brand-border)' }}>
                        {['Projeto', 'Saldo', 'Consumo', 'Status'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--brand-subtle)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allProjects = d.projects.filter(p => !p.is_sustentacao)
                        const filteredProjects = !projectFilter
                          ? allProjects
                          : allProjects.some(p => p.id === projectFilter)
                            ? allProjects.filter(p => p.id === projectFilter)
                            : allProjects.filter(p => p.children.some(c => c.id === projectFilter))
                        const mostCriticalId = filteredProjects
                          .filter(p => p.health === 'critical')
                          .sort((a, b) => b.consumption_pct - a.consumption_pct)[0]?.id
                        return filteredProjects.map(p => {
                        const c = HC[p.health]
                        const expanded = expandedProjects.has(p.id)
                        const hasChildren = p.children.length > 0
                        const isMostCritical = p.id === mostCriticalId
                        return (
                          <>
                            <tr
                              key={p.id}
                              className="border-b transition-colors"
                              style={{ borderColor: 'var(--brand-border)', cursor: hasChildren ? 'pointer' : 'default',
                                background: isMostCritical ? 'rgba(239,68,68,0.04)' : undefined }}
                              onClick={() => hasChildren && toggleProject(p.id)}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  {hasChildren
                                    ? expanded
                                      ? <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                      : <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--brand-subtle)' }} />
                                    : <span className="w-[14px] shrink-0" />
                                  }
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium" style={{ color: 'var(--brand-text)' }}>{p.name}</span>
                                    {p.code && <span className="text-xs" style={{ color: 'var(--brand-subtle)' }}>{p.code}</span>}
                                    {hasChildren && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(0,245,255,0.10)', color: 'var(--brand-primary)' }}>PAI</span>
                                    )}
                                    {isMostCritical && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>🔥 1º risco</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 tabular-nums font-semibold whitespace-nowrap"
                                style={{ color: p.balance_hours < 0 ? HC.critical.text : 'var(--brand-text)' }}>
                                {p.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(p.balance_hours))}h
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(p.consumption_pct, 100)}%`, background: c.bar }} />
                                  </div>
                                  <span className="text-xs tabular-nums font-semibold" style={{ color: c.text }}>
                                    {fmt(p.consumption_pct)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                                  style={{ background: c.bg, color: c.text }}>
                                  {p.health === 'ok' ? 'OK' : p.health === 'warning' ? 'Atenção' : 'Crítico'}
                                </span>
                              </td>
                            </tr>
                            {expanded && p.children.map(child => {
                              const cc = HC[child.health]
                              return (
                                <tr key={child.id} className="border-b"
                                  style={{ borderColor: 'var(--brand-border)', background: 'rgba(255,255,255,0.015)' }}>
                                  <td className="py-2.5" style={{ paddingLeft: 32 }}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-medium" style={{ color: 'var(--brand-muted)' }}>{child.name}</span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>FILHO</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-2.5 tabular-nums text-sm font-medium whitespace-nowrap"
                                    style={{ color: child.balance_hours < 0 ? HC.critical.text : 'var(--brand-muted)' }}>
                                    {child.balance_hours < 0 ? '−' : ''}{fmt(Math.abs(child.balance_hours))}h
                                  </td>
                                  <td className="px-5 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${Math.min(child.consumption_pct, 100)}%`, background: cc.bar }} />
                                      </div>
                                      <span className="text-xs tabular-nums font-semibold" style={{ color: cc.text }}>
                                        {fmt(child.consumption_pct)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-2.5">
                                    <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                                      style={{ background: cc.bg, color: cc.text }}>
                                      {child.health === 'ok' ? 'OK' : child.health === 'warning' ? 'Atenção' : 'Crítico'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </>
                        )
                      })
                      })()}
                    </tbody>
                  </table>
                ) : !loading ? (
                  <div className="flex items-center justify-center py-10 text-sm" style={{ color: 'var(--brand-subtle)' }}>
                    Nenhum projeto encontrado
                  </div>
                ) : null}
              </div>

              {/* ── 5. Sustentação ── */}
              {!loading && d && (d.support.total_tickets > 0 || d.support.consumed_hours > 0) && (
                <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--brand-text)' }}>Sustentação</h2>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Chamados abertos',   value: d.support.open_tickets,     unit: '' },
                        { label: 'Resolvidos no mês',  value: d.support.resolved_tickets, unit: '' },
                        { label: 'Horas consumidas',   value: d.support.consumed_hours,   unit: 'h' },
                        { label: 'Tempo médio/chamado',value: d.support.avg_hours_ticket,  unit: 'h' },
                      ].map((kpi, i) => (
                        <div key={i} className="rounded-xl p-4 border"
                          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--brand-border)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--brand-subtle)' }}>
                            {kpi.label}
                          </p>
                          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--brand-text)' }}>
                            {fmt(kpi.value)}{kpi.unit}
                          </p>
                        </div>
                      ))}
                    </div>

                    {d.support.monthly_tickets.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--brand-subtle)' }}>
                          Chamados por Mês
                        </p>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={d.support.monthly_tickets} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                              <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, color: '#E4E4E7' }}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                formatter={(v: any) => [v, 'Chamados']}
                              />
                              <Bar dataKey="count" fill="#00F5FF" radius={[4, 4, 0, 0]} opacity={0.85} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
