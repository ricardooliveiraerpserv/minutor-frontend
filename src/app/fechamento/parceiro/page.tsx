'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import { SearchSelect } from '@/components/ui/search-select'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Lock, RefreshCw, Handshake } from 'lucide-react'
import {
  PageHeader, Table, Thead, Th, Tbody, Tr, Td,
  Badge, Button, SkeletonTable, EmptyState,
} from '@/components/ds'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ParceiroStatus {
  partner_id: number
  nome: string
  pricing_type: 'fixed' | 'variable'
  hourly_rate: number
  status: 'open' | 'closed' | 'sem_registro'
  total_horas: number
  total_despesas: number
  total_a_pagar: number
  closed_at?: string
  closed_by_name?: string
}

interface ConsultorRow {
  user_id: number
  nome: string
  horas: number
  rate_type: string
  valor_hora: number
  pricing_type_parceiro: string
  total: number
}

interface DespesaRow {
  id: number
  data: string
  descricao: string
  categoria: string
  colaborador: string
  projeto: string
  valor: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYearMonth(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function fmtYearMonth(ym: string): string {
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = ym.split('-')
  return `${MONTHS[parseInt(m) - 1]}/${y}`
}

const now = new Date()

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FechamentoParceiroPage() {
  const { user } = useAuth()
  const isAdmin = (user as any)?.type === 'admin'

  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [year,  setYear]  = useState<number | null>(now.getFullYear())
  const yearMonth = month && year ? toYearMonth(month, year) : ''

  const [parceiros, setParceiros]       = useState<ParceiroStatus[]>([])
  const [partnerId, setPartnerId]       = useState<number | null>(null)
  const [status, setStatus]             = useState<ParceiroStatus | null>(null)
  const [tab, setTab]                   = useState<'consultores' | 'despesas' | 'resumo'>('consultores')
  const [consultores, setConsultores]   = useState<ConsultorRow[]>([])
  const [despesas, setDespesas]         = useState<DespesaRow[]>([])
  const [loadingConsult, setLoadingConsult] = useState(false)
  const [loadingDesp,    setLoadingDesp]    = useState(false)
  const [loadingFechar,  setLoadingFechar]  = useState(false)
  const [loadingReabrir, setLoadingReabrir] = useState(false)

  const loadParceiros = useCallback(() => {
    if (!yearMonth) return
    api.get<{ data: ParceiroStatus[] }>(`/fechamento-parceiro?year_month=${yearMonth}`)
      .then(r => {
        setParceiros(r.data ?? [])
        if (partnerId) {
          const current = r.data?.find(p => p.partner_id === partnerId)
          setStatus(current ?? null)
        }
      })
      .catch(() => {})
  }, [yearMonth, partnerId])

  useEffect(() => {
    loadParceiros()
    setConsultores([])
    setDespesas([])
  }, [yearMonth])

  useEffect(() => {
    if (!partnerId) { setStatus(null); return }
    const found = parceiros.find(p => p.partner_id === partnerId)
    setStatus(found ?? null)
    setConsultores([])
    setDespesas([])
    setTab('consultores')
  }, [partnerId, parceiros])

  const loadConsultores = useCallback(() => {
    if (!partnerId || !yearMonth) return
    setLoadingConsult(true)
    api.get<{ data: ConsultorRow[] }>(`/fechamento-parceiro/${partnerId}/${yearMonth}/consultores`)
      .then(r => setConsultores(r.data ?? []))
      .catch(() => toast.error('Erro ao carregar consultores'))
      .finally(() => setLoadingConsult(false))
  }, [partnerId, yearMonth])

  const loadDespesas = useCallback(() => {
    if (!partnerId || !yearMonth) return
    setLoadingDesp(true)
    api.get<{ data: DespesaRow[] }>(`/fechamento-parceiro/${partnerId}/${yearMonth}/despesas`)
      .then(r => setDespesas(r.data ?? []))
      .catch(() => toast.error('Erro ao carregar despesas'))
      .finally(() => setLoadingDesp(false))
  }, [partnerId, yearMonth])

  useEffect(() => {
    if (!partnerId || !yearMonth) return
    if (tab === 'consultores') loadConsultores()
    if (tab === 'despesas')    loadDespesas()
    if (tab === 'resumo') {
      if (!consultores.length) loadConsultores()
      if (!despesas.length)    loadDespesas()
    }
  }, [tab, partnerId, yearMonth])

  useEffect(() => {
    if (partnerId && yearMonth) loadConsultores()
  }, [partnerId])

  const totalHoras    = consultores.reduce((s, r) => s + r.horas, 0)
  const totalServicos = consultores.reduce((s, r) => s + r.total, 0)
  const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0)
  const totalAPagar   = totalServicos + totalDespesas

  const handleFechar = () => {
    if (!partnerId || !yearMonth) return
    setLoadingFechar(true)
    api.post(`/fechamento-parceiro/${partnerId}/${yearMonth}/fechar`, {})
      .then(() => { toast.success('Fechamento encerrado!'); loadParceiros() })
      .catch(() => toast.error('Erro ao fechar'))
      .finally(() => setLoadingFechar(false))
  }

  const handleReabrir = () => {
    if (!partnerId || !yearMonth) return
    setLoadingReabrir(true)
    api.post(`/fechamento-parceiro/${partnerId}/${yearMonth}/reabrir`, {})
      .then(() => {
        toast.success('Fechamento reaberto.')
        setConsultores([])
        setDespesas([])
        loadParceiros()
        loadConsultores()
      })
      .catch(() => toast.error('Erro ao reabrir'))
      .finally(() => setLoadingReabrir(false))
  }

  const isClosed   = status?.status === 'closed'
  const isFixed    = status?.pricing_type === 'fixed'
  const parceiroOptions = parceiros.map(p => ({ id: p.partner_id, name: p.nome }))

  return (
    <AppLayout title="Fechamento — Parceiros">
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <Handshake size={20} style={{ color: 'var(--brand-primary)' }} />
            <h1 className="text-lg font-semibold" style={{ color: 'var(--brand-text)' }}>
              Fechamento — Parceiros
            </h1>
            {yearMonth && (
              <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>
                {fmtYearMonth(yearMonth)}
              </span>
            )}
            {isClosed && (
              <Badge variant="success">
                <Lock size={10} className="mr-1" /> FECHADO
              </Badge>
            )}
            {status?.status === 'open' && <Badge variant="warning">ABERTO</Badge>}

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <SearchSelect
                value={partnerId ?? ''}
                onChange={v => setPartnerId(v ? Number(v) : null)}
                options={parceiroOptions}
                placeholder="Selecionar parceiro..."
              />
              <MonthYearPicker
                month={month}
                year={year}
                onChange={(m, y) => { setMonth(m || null); setYear(y || null) }}
              />
              {isAdmin && partnerId && yearMonth && !isClosed && (
                <Button size="sm" onClick={handleFechar} disabled={loadingFechar} style={{ background: 'var(--brand-primary)', color: '#000' }}>
                  {loadingFechar ? <RefreshCw size={12} className="animate-spin" /> : <Lock size={12} />}
                  <span className="ml-1">Fechar</span>
                </Button>
              )}
              {isAdmin && isClosed && (
                <Button size="sm" variant="secondary" onClick={handleReabrir} disabled={loadingReabrir}>
                  {loadingReabrir ? <RefreshCw size={12} className="animate-spin" /> : null}
                  Reabrir
                </Button>
              )}
            </div>
          </div>

          {/* Chip de tipo de precificação */}
          {status && (
            <div className="mt-3 flex items-center gap-3">
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: isFixed ? 'rgba(251,191,36,0.15)' : 'rgba(0,245,255,0.1)',
                  color: isFixed ? '#fbbf24' : 'var(--brand-primary)',
                }}
              >
                {isFixed ? 'PRECIFICAÇÃO FIXA' : 'PRECIFICAÇÃO VARIÁVEL'}
              </span>
              {isFixed && status.hourly_rate > 0 && (
                <span className="text-xs" style={{ color: 'var(--brand-muted)' }}>
                  Taxa única: <b>{formatBRL(status.hourly_rate)}/h</b>
                </span>
              )}
            </div>
          )}

          {/* Banner snapshot */}
          {isClosed && status && (
            <div className="mt-3 px-3 py-2 rounded text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
              Dados históricos — fechado em {new Date(status.closed_at!).toLocaleDateString('pt-BR')}
              {status.closed_by_name ? ` por ${status.closed_by_name}` : ''}
            </div>
          )}
        </div>

        {!partnerId ? (
          <EmptyState icon={Handshake} title="Selecione um parceiro" description="Escolha o parceiro e a competência para visualizar o fechamento." />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-6 border-b" style={{ borderColor: 'var(--brand-border)' }}>
              {(['consultores', 'despesas', 'resumo'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: tab === t ? 'var(--brand-primary)' : 'var(--brand-muted)',
                    borderBottom: tab === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  }}
                >
                  {t === 'consultores' ? 'Consultores' : t === 'despesas' ? 'Despesas' : 'Resumo'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {/* Tab Consultores */}
              {tab === 'consultores' && (
                <div className="p-6">
                  {loadingConsult ? (
                    <SkeletonTable rows={4} cols={4} />
                  ) : consultores.length === 0 ? (
                    <EmptyState icon={Handshake} title="Sem consultores" description="Nenhum consultor com apontamentos aprovados neste período." />
                  ) : (
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Consultor</Th>
                          <Th right>Horas</Th>
                          <Th right>Taxa/h</Th>
                          <Th right>Total</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {consultores.map(row => (
                          <Tr key={row.user_id}>
                            <Td>
                              <div className="text-xs font-medium" style={{ color: 'var(--brand-text)' }}>{row.nome}</div>
                              {row.rate_type === 'monthly' && !isFixed && (
                                <div className="text-xs" style={{ color: 'var(--brand-subtle)' }}>Mensalista · ÷180</div>
                              )}
                            </Td>
                            <Td right className="tabular-nums text-xs">{row.horas.toFixed(2)}h</Td>
                            <Td right className="tabular-nums text-xs">{formatBRL(row.valor_hora)}/h</Td>
                            <Td right className="tabular-nums text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
                              {formatBRL(row.total)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  {consultores.length > 0 && (
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'var(--brand-muted)' }}>
                        Total: <b>{totalHoras.toFixed(2)}h</b>
                      </span>
                      <div className="text-sm font-semibold px-4 py-2 rounded" style={{ background: 'rgba(0,245,255,0.07)', color: 'var(--brand-primary)' }}>
                        Total Serviços: {formatBRL(totalServicos)}
                      </div>
                    </div>
                  )}
                  {isFixed && consultores.length > 0 && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--brand-subtle)' }}>
                      * Taxa fixa do parceiro aplicada a todos os consultores.
                    </p>
                  )}
                </div>
              )}

              {/* Tab Despesas */}
              {tab === 'despesas' && (
                <div className="p-6">
                  {loadingDesp ? (
                    <SkeletonTable rows={4} cols={6} />
                  ) : despesas.length === 0 ? (
                    <EmptyState icon={Handshake} title="Sem despesas" description="Nenhuma despesa aprovada dos consultores neste período." />
                  ) : (
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Data</Th>
                          <Th>Descrição</Th>
                          <Th>Categoria</Th>
                          <Th>Consultor</Th>
                          <Th>Projeto</Th>
                          <Th right>Valor</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {despesas.map(row => (
                          <Tr key={row.id}>
                            <Td className="text-xs tabular-nums">{new Date(row.data + 'T12:00:00').toLocaleDateString('pt-BR')}</Td>
                            <Td className="text-xs">{row.descricao}</Td>
                            <Td className="text-xs">{row.categoria}</Td>
                            <Td className="text-xs">{row.colaborador}</Td>
                            <Td className="text-xs">{row.projeto}</Td>
                            <Td right className="tabular-nums text-xs font-medium" style={{ color: 'var(--brand-primary)' }}>{formatBRL(row.valor)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  {despesas.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <div className="text-sm font-semibold px-4 py-2 rounded" style={{ background: 'rgba(0,245,255,0.07)', color: 'var(--brand-primary)' }}>
                        Total Despesas: {formatBRL(totalDespesas)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Resumo */}
              {tab === 'resumo' && (
                <div className="p-6 max-w-md">
                  <div className="rounded-lg p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brand-border)' }}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--brand-text)' }}>
                      Resumo — {yearMonth ? fmtYearMonth(yearMonth) : ''}
                      {isClosed && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--brand-muted)' }}>(dados do snapshot)</span>}
                    </h3>
                    <div className="flex justify-between text-sm" style={{ color: 'var(--brand-muted)' }}>
                      <span>Total Horas Trabalhadas</span>
                      <span className="tabular-nums">{(isClosed ? status!.total_horas : totalHoras).toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between text-sm" style={{ color: 'var(--brand-muted)' }}>
                      <span>Total Serviços</span>
                      <span className="tabular-nums">{formatBRL(totalServicos)}</span>
                    </div>
                    <div className="flex justify-between text-sm" style={{ color: 'var(--brand-muted)' }}>
                      <span>Total Despesas</span>
                      <span className="tabular-nums">{formatBRL(isClosed ? status!.total_despesas : totalDespesas)}</span>
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: 'var(--brand-border)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--brand-text)' }}>TOTAL A PAGAR</span>
                        <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>
                          {formatBRL(isClosed ? status!.total_a_pagar : totalAPagar)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
