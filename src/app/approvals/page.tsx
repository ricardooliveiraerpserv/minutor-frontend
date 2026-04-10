'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { useApiQuery } from '@/hooks/use-query'
import { Timesheet, Expense } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckSquare, Clock, Receipt, ChevronLeft, ChevronRight, Check, X, XCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PendingTimesheets {
  success: boolean
  data: Timesheet[]
  pagination: { current_page: number; last_page: number; total: number; per_page: number }
}

interface PendingExpenses {
  success: boolean
  data: Expense[]
  pagination: { current_page: number; last_page: number; total: number; per_page: number }
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function formatMinutes(minutes: number) {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'timesheets' | 'expenses'>('timesheets')
  const [tsPage, setTsPage] = useState(1)
  const [expPage, setExpPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])
  const [approving, setApproving] = useState(false)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; ids: number[]; single?: boolean }>({ open: false, ids: [] })
  const [rejectReason, setRejectReason] = useState('')
  const [actioning, setActioning] = useState<number | null>(null)

  const tsParams = useMemo(() => new URLSearchParams({ page: String(tsPage), per_page: '20' }).toString(), [tsPage])
  const expParams = useMemo(() => new URLSearchParams({ page: String(expPage), per_page: '20' }).toString(), [expPage])

  const { data: tsData, loading: tsLoading, refetch: tsRefetch } = useApiQuery<PendingTimesheets>(
    `/approvals/timesheets?${tsParams}`, [tsParams]
  )
  const { data: expData, loading: expLoading, refetch: expRefetch } = useApiQuery<PendingExpenses>(
    `/approvals/expenses?${expParams}`, [expParams]
  )

  const currentItems = tab === 'timesheets'
    ? (Array.isArray(tsData?.data) ? tsData!.data : [])
    : (Array.isArray(expData?.data) ? expData!.data : [])
  const currentLoading = tab === 'timesheets' ? tsLoading : expLoading
  const currentPagination = tab === 'timesheets' ? tsData?.pagination : expData?.pagination

  const allSelected = currentItems.length > 0 && currentItems.every(i => selected.includes(i.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(s => s.filter(id => !currentItems.find(i => i.id === id)))
    } else {
      setSelected(s => [...new Set([...s, ...currentItems.map(i => i.id)])])
    }
  }

  const toggleOne = (id: number) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const handleApprove = async () => {
    if (selected.length === 0) return
    setApproving(true)
    try {
      if (tab === 'timesheets') {
        await api.post('/approvals/timesheets/bulk-approve', { timesheet_ids: selected })
        toast.success(`${selected.length} apontamento(s) aprovado(s)`)
        tsRefetch()
      } else {
        await api.post('/approvals/expenses/bulk-approve', { expense_ids: selected })
        toast.success(`${selected.length} despesa(s) aprovada(s)`)
        expRefetch()
      }
      setSelected([])
    } catch {
      toast.error('Erro ao aprovar. Tente novamente.')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (rejectModal.ids.length === 0) return
    setApproving(true)
    try {
      if (tab === 'timesheets') {
        if (rejectModal.ids.length === 1) {
          await api.post(`/timesheets/${rejectModal.ids[0]}/reject`, { reason: rejectReason })
        } else {
          await api.post('/approvals/timesheets/bulk-reject', { timesheet_ids: rejectModal.ids, reason: rejectReason })
        }
        toast.success(`${rejectModal.ids.length} apontamento(s) rejeitado(s)`)
        tsRefetch()
      } else {
        if (rejectModal.ids.length === 1) {
          await api.post(`/expenses/${rejectModal.ids[0]}/reject`, { reason: rejectReason })
        } else {
          await api.post('/approvals/expenses/bulk-reject', { expense_ids: rejectModal.ids, reason: rejectReason })
        }
        toast.success(`${rejectModal.ids.length} despesa(s) rejeitada(s)`)
        expRefetch()
      }
      setSelected([])
      setRejectModal({ open: false, ids: [] })
      setRejectReason('')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao rejeitar')
    } finally {
      setApproving(false)
    }
  }

  const approveOne = async (id: number) => {
    setActioning(id)
    try {
      if (tab === 'timesheets') {
        await api.post(`/timesheets/${id}/approve`, {})
        toast.success('Apontamento aprovado')
        tsRefetch()
      } else {
        await api.post(`/expenses/${id}/approve`, { charge_client: false })
        toast.success('Despesa aprovada')
        expRefetch()
      }
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Erro ao aprovar') }
    finally { setActioning(null) }
  }

  const handleTabChange = (t: 'timesheets' | 'expenses') => {
    setTab(t)
    setSelected([])
  }

  return (
    <AppLayout title="Aprovações">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => handleTabChange('timesheets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'timesheets' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Clock size={12} />
          Apontamentos
          {(tsData?.pagination?.total ?? 0) > 0 && (
            <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {tsData?.pagination?.total}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('expenses')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'expenses' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Receipt size={12} />
          Despesas
          {(expData?.pagination?.total ?? 0) > 0 && (
            <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {expData?.pagination?.total}
            </span>
          )}
        </button>

        {selected.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zinc-500">{selected.length} selecionado(s)</span>
            <button onClick={handleApprove} disabled={approving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors">
              <Check size={12} />{approving ? 'Aprovando...' : 'Aprovar'}
            </button>
            <button onClick={() => { setRejectModal({ open: true, ids: selected }); setRejectReason('') }} disabled={approving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors">
              <XCircle size={12} />Rejeitar
            </button>
            <button onClick={() => setSelected([])} className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-800 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-zinc-400"
                />
              </th>
              <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Data</th>
              <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Colaborador</th>
              <th className="text-left px-3 py-2.5 text-zinc-500 font-medium hidden md:table-cell">Projeto</th>
              {tab === 'timesheets' ? (
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium">Tempo</th>
              ) : (
                <th className="text-right px-3 py-2.5 text-zinc-500 font-medium">Valor</th>
              )}
              <th className="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {currentLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/60">
                <td className="px-3 py-2.5"><Skeleton className="h-3 w-3" /></td>
                <td className="px-3 py-2.5"><Skeleton className="h-3 w-20" /></td>
                <td className="px-3 py-2.5"><Skeleton className="h-3 w-28" /></td>
                <td className="px-3 py-2.5 hidden md:table-cell"><Skeleton className="h-3 w-32" /></td>
                <td className="px-3 py-2.5"><Skeleton className="h-3 w-12 ml-auto" /></td>
              </tr>
            ))}

            {!currentLoading && currentItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-zinc-500">
                  <CheckSquare size={24} className="mx-auto mb-2 opacity-30" />
                  Nenhum item pendente de aprovação
                </td>
              </tr>
            )}

            {!currentLoading && tab === 'timesheets' && (Array.isArray(tsData?.data) ? tsData!.data : []).map(ts => (
              <tr
                key={ts.id}
                onClick={() => toggleOne(ts.id)}
                className={`border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer transition-colors ${
                  selected.includes(ts.id)
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(ts.id)}
                    onChange={() => toggleOne(ts.id)}
                    className="rounded border-zinc-400"
                  />
                </td>
                <td className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  {formatDate(ts.date)}
                </td>
                <td className="px-3 py-2.5 text-zinc-800 dark:text-zinc-200">
                  {ts.user?.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-zinc-500 hidden md:table-cell truncate max-w-[180px]">
                  {ts.project?.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-zinc-300">
                  {formatMinutes(ts.effort_minutes)}
                </td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => approveOne(ts.id)} disabled={actioning === ts.id} title="Aprovar" className="p-1 text-zinc-500 hover:text-green-400 transition-colors"><Check size={12} /></button>
                    <button onClick={() => { setRejectModal({ open: true, ids: [ts.id], single: true }); setRejectReason('') }} title="Rejeitar" className="p-1 text-zinc-500 hover:text-red-400 transition-colors"><XCircle size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}

            {!currentLoading && tab === 'expenses' && (Array.isArray(expData?.data) ? expData!.data : []).map(exp => (
              <tr
                key={exp.id}
                onClick={() => toggleOne(exp.id)}
                className={`border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer transition-colors ${
                  selected.includes(exp.id)
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(exp.id)}
                    onChange={() => toggleOne(exp.id)}
                    className="rounded border-zinc-400"
                  />
                </td>
                <td className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  {formatDate(exp.expense_date)}
                </td>
                <td className="px-3 py-2.5 text-zinc-800 dark:text-zinc-200">
                  {exp.user?.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-zinc-500 hidden md:table-cell truncate max-w-[180px]">
                  {exp.project?.name ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-zinc-300">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => approveOne(exp.id)} disabled={actioning === exp.id} title="Aprovar" className="p-1 text-zinc-500 hover:text-green-400 transition-colors"><Check size={12} /></button>
                    <button onClick={() => { setRejectModal({ open: true, ids: [exp.id], single: true }); setRejectReason('') }} title="Rejeitar" className="p-1 text-zinc-500 hover:text-red-400 transition-colors"><XCircle size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(currentItems.length > 0) && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-zinc-500">
            Página {currentPagination?.current_page ?? 1} de {currentPagination?.last_page ?? 1}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => tab === 'timesheets' ? setTsPage(p => Math.max(1, p - 1)) : setExpPage(p => Math.max(1, p - 1))}
              disabled={(currentPagination?.current_page ?? 1) === 1}
              className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => tab === 'timesheets' ? setTsPage(p => p + 1) : setExpPage(p => p + 1)}
              disabled={(currentPagination?.current_page ?? 1) >= (currentPagination?.last_page ?? 1)}
              className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {/* Modal rejeição */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-1">
              {rejectModal.single ? 'Rejeitar item' : `Rejeitar ${rejectModal.ids.length} item(ns)`}
            </h3>
            <p className="text-xs text-zinc-400 mb-3">Informe o motivo da rejeição (opcional).</p>
            <Label className="text-xs text-zinc-400">Motivo</Label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Ex: Fora do prazo, informação incorreta..."
              className="mt-1 bg-zinc-800 border-zinc-700 text-white h-9 text-xs" />
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setRejectModal({ open: false, ids: [] })}
                className="h-8 text-xs border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button onClick={handleReject} disabled={approving}
                className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white">
                {approving ? 'Rejeitando...' : 'Confirmar rejeição'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
