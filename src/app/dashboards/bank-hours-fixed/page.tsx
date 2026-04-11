'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Customer { id: number; name: string }
interface Project  { id: number; name: string; code: string; parent_project_id: number | null }

interface SummaryData {
  contracted_hours: number
  accumulated_contracted_hours: number
  contributed_hours: number
  consumed_hours: number
  projects_consumed_hours: number
  maintenance_consumed_hours: number
  month_consumed_hours: number
  hours_balance: number
  exceeded_hours: number
  amount_to_pay: number | null
  hourly_rate: number | null
  contributed_hours_history: ContributionItem[]
}

interface ContributionItem {
  id: number
  project: { id: number; name: string; code: string }
  difference: number
  old_value: number | null
  new_value: number | null
  reason: string | null
  changed_by: { name: string } | null
  created_at: string
  contributed_hours?: number
  hourly_rate?: number
  total_value?: number
  description?: string
}

interface ProjectItem {
  id: number
  name: string
  code: string
  status_display: string
  contract_type_display: string
  sold_hours: number | null
  total_contributions_hours: number
  hour_contribution: number | null
  hours_balance: number
  start_date: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtH(h: number) {
  return h.toFixed(1) + 'h'
}
function fmtBRL(v: number | null) {
  if (v === null) return '-'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: 'green' | 'red' | 'default' }) {
  const valueColor =
    color === 'green' ? 'text-green-400' :
    color === 'red'   ? 'text-red-400'   :
    'text-zinc-100'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-zinc-700 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BankHoursFixedPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('Administrator') ||
    user?.permissions?.includes('admin.full_access') || false

  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('')
  const [selectedProject, setSelectedProject]   = useState<number | ''>('')

  const [summary, setSummary]           = useState<SummaryData | null>(null)
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  const [activeTab, setActiveTab] = useState<'total' | 'projects'>('total')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Fetch customers (admin only)
  useEffect(() => {
    if (!isAdmin) return
    api.get<any>('/customers?pageSize=1000').then(r => {
      setCustomers(Array.isArray(r?.items) ? r.items : [])
    }).catch(() => {})
  }, [isAdmin])

  // Fetch projects when customer changes
  useEffect(() => {
    const params = new URLSearchParams({ pageSize: '1000', parent_projects_only: 'true' })
    if (selectedCustomer) params.set('customer_id', String(selectedCustomer))
    api.get<any>(`/projects?${params}`).then(r => {
      setProjects(Array.isArray(r?.items) ? r.items : [])
    }).catch(() => {})
  }, [selectedCustomer])

  // Fetch summary data
  const fetchSummary = useCallback(() => {
    if (!selectedProject && isAdmin) return
    const params = new URLSearchParams()
    if (selectedCustomer) params.set('customer_id', String(selectedCustomer))
    if (selectedProject)  params.set('project_id',  String(selectedProject))
    setLoadingSummary(true)
    api.get<any>(`/dashboards/bank-hours-fixed?${params}`)
      .then(r => setSummary(r?.data ?? r ?? null))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false))
  }, [selectedCustomer, selectedProject, isAdmin])

  // Fetch projects list
  const fetchProjectsList = useCallback(() => {
    if (!selectedProject && isAdmin) return
    const params = new URLSearchParams()
    if (selectedCustomer) params.set('customer_id', String(selectedCustomer))
    if (selectedProject)  params.set('project_id',  String(selectedProject))
    setLoadingProjects(true)
    api.get<any>(`/dashboards/bank-hours-fixed/projects?${params}`)
      .then(r => setProjectsList(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setProjectsList([]))
      .finally(() => setLoadingProjects(false))
  }, [selectedCustomer, selectedProject, isAdmin])

  useEffect(() => {
    fetchSummary()
    fetchProjectsList()
  }, [fetchSummary, fetchProjectsList])

  const hasFilters = !isAdmin || (!!selectedCustomer && !!selectedProject)

  const balanceColor = (v: number) => v >= 0 ? 'green' : 'red'

  return (
    <AppLayout title="Dashboard - Banco de Horas Fixo">
      <div className="space-y-6">

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Cliente</label>
              <select
                value={selectedCustomer}
                onChange={e => { setSelectedCustomer(e.target.value === '' ? '' : Number(e.target.value)); setSelectedProject('') }}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 min-w-48"
              >
                <option value="">Todos os clientes</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-400">Projeto</label>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 min-w-64"
            >
              <option value="">Selecione um projeto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Prompt when no project selected */}
        {!hasFilters && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400 text-sm">
              {isAdmin
                ? 'Selecione um cliente e um projeto para visualizar os dados do dashboard.'
                : 'Selecione um projeto para visualizar os dados do dashboard.'}
            </p>
          </div>
        )}

        {hasFilters && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-800 pb-0">
              <TabButton label="Total Geral" active={activeTab === 'total'}    onClick={() => setActiveTab('total')} />
              <TabButton label="Projetos"    active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            </div>

            {/* Total Tab */}
            {activeTab === 'total' && (
              <div className="space-y-4">
                {loadingSummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-7 w-16" />
                      </div>
                    ))}
                  </div>
                ) : summary ? (
                  <>
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <StatCard label="Horas Contratadas"  value={fmtH(summary.contracted_hours)} />
                      <StatCard label="Aporte de Horas"    value={fmtH(summary.contributed_hours)} />
                      <StatCard
                        label="Consumo Acumulado"
                        value={fmtH(summary.consumed_hours)}
                        sub={`Projetos: ${fmtH(summary.projects_consumed_hours ?? 0)} | Sustentação: ${fmtH(summary.maintenance_consumed_hours ?? 0)}`}
                      />
                      <StatCard label="Consumo do Mês"    value={fmtH(summary.month_consumed_hours)} />
                      <StatCard
                        label="Saldo de Horas"
                        value={fmtH(summary.hours_balance)}
                        color={balanceColor(summary.hours_balance)}
                      />
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <StatCard
                        label="Horas Excedentes"
                        value={fmtH(summary.exceeded_hours)}
                        color={summary.exceeded_hours > 0 ? 'red' : 'default'}
                      />
                      <StatCard label="Valor Hora"      value={fmtBRL(summary.hourly_rate)} />
                      <StatCard
                        label="Valor a Pagar"
                        value={fmtBRL(summary.amount_to_pay)}
                        color={(summary.amount_to_pay ?? 0) > 0 ? 'red' : 'default'}
                      />
                    </div>

                    {/* Contribution History */}
                    {summary.contributed_hours_history?.length > 0 && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-zinc-200 mb-3">Histórico de Aporte de Horas</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="text-left py-2 px-3 text-xs text-zinc-400 font-medium">Projeto</th>
                                <th className="text-right py-2 px-3 text-xs text-zinc-400 font-medium">Horas</th>
                                <th className="text-right py-2 px-3 text-xs text-zinc-400 font-medium">Valor/h</th>
                                <th className="text-right py-2 px-3 text-xs text-zinc-400 font-medium">Total</th>
                                <th className="text-left py-2 px-3 text-xs text-zinc-400 font-medium">Data</th>
                                <th className="text-left py-2 px-3 text-xs text-zinc-400 font-medium">Por</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summary.contributed_hours_history.map(item => (
                                <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                  <td className="py-2 px-3 text-zinc-300">{item.project?.code} - {item.project?.name}</td>
                                  <td className="py-2 px-3 text-right text-zinc-300">{(item.contributed_hours ?? item.difference ?? 0).toFixed(0)}h</td>
                                  <td className="py-2 px-3 text-right text-zinc-300">{fmtBRL(item.hourly_rate ?? null)}</td>
                                  <td className="py-2 px-3 text-right text-zinc-300">{fmtBRL(item.total_value ?? null)}</td>
                                  <td className="py-2 px-3 text-zinc-400">{fmtDate(item.created_at)}</td>
                                  <td className="py-2 px-3 text-zinc-400">{item.changed_by?.name ?? '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-400 text-sm">Nenhum dado disponível.</p>
                )}
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {loadingProjects ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-800/50">
                          <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">Código</th>
                          <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">Projeto</th>
                          <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">Tipo</th>
                          <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium">Horas Vendidas</th>
                          <th className="text-right py-3 px-4 text-xs text-zinc-400 font-medium">Saldo</th>
                          <th className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">Início</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-zinc-500 text-sm">
                              Nenhum projeto encontrado.
                            </td>
                          </tr>
                        ) : projectsList.map(p => {
                          const balance = p.hours_balance ?? 0
                          const contributions = p.total_contributions_hours || p.hour_contribution || 0
                          return (
                            <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                              <td className="py-2.5 px-4 text-zinc-400 font-mono text-xs">{p.code}</td>
                              <td className="py-2.5 px-4 text-zinc-200">{p.name}</td>
                              <td className="py-2.5 px-4 text-zinc-400 text-xs">{p.status_display}</td>
                              <td className="py-2.5 px-4 text-zinc-400 text-xs">{p.contract_type_display}</td>
                              <td className="py-2.5 px-4 text-right text-zinc-300">
                                {p.sold_hours !== null
                                  ? contributions > 0
                                    ? `${p.sold_hours} (+${contributions})`
                                    : String(p.sold_hours)
                                  : '-'}
                              </td>
                              <td className={`py-2.5 px-4 text-right font-medium ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {fmtH(balance)}
                              </td>
                              <td className="py-2.5 px-4 text-zinc-400 text-xs">
                                {p.start_date ? fmtDate(p.start_date) : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
