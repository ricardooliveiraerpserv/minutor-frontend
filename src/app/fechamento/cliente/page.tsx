'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { api } from '@/lib/api'
import { formatBRL } from '@/lib/format'
import { MonthYearPicker } from '@/components/ui/month-year-picker'
import { SearchSelect } from '@/components/ui/search-select'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Lock, RefreshCw, Building2 } from 'lucide-react'
import {
  PageHeader, Table, Thead, Th, Tbody, Tr, Td,
  Badge, Button, SkeletonTable, EmptyState,
} from '@/components/ds'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ClienteStatus {
  customer_id: number
  nome: string
  status: 'open' | 'closed' | 'sem_registro'
  total_servicos: number
  total_despesas: number
  total_geral: number
  closed_at?: string
  closed_by_name?: string
}

interface ContratoRow {
  projeto_id: number
  projeto_nome: string
  projeto_codigo: string
  tipo_contrato: string
  tipo_faturamento: string
  horas_aprovadas: number
  horas_contratadas: number
  horas_consumidas: number
  valor_base: number
  total_receita: number
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

function fmtTipoFaturamento(tipo: string): string {
  const map: Record<string, string> = {
    on_demand:  'On Demand',
    banco_horas: 'Banco de Horas',
    fechado:    'Fechado',
    outros:     'Outros',
  }
  return map[tipo] ?? tipo
}

const now = new Date()

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FechamentoClientePage() {
  const { user } = useAuth()
  const isAdmin = (user as any)?.type === 'admin'

  const [month, setMonth] = useState<number | null>(now.getMonth() + 1)
  const [year,  setYear]  = useState<number | null>(now.getFullYear())
  const yearMonth = month && year ? toYearMonth(month, year) : ''

  const [clientes, setClientes]       = useState<ClienteStatus[]>([])
  const [customerId, setCustomerId]   = useState<number | null>(null)
  const [status, setStatus]           = useState<ClienteStatus | null>(null)
  const [tab, setTab]                 = useState<'contratos' | 'despesas' | 'resumo'>('contratos')
  const [contratos, setContratos]     = useState<ContratoRow[]>([])
  const [despesas, setDespesas]       = useState<DespesaRow[]>([])
  const [loadingContratos, setLoadingContratos] = useState(false)
  const [loadingDespesas,  setLoadingDespesas]  = useState(false)
  const [loadingFechar,    setLoadingFechar]    = useState(false)
  const [loadingReabrir,   setLoadingReabrir]   = useState(false)

  // Carrega lista de clientes ao mudar mês
  const loadClientes = useCallback(() => {
    if (!yearMonth) return
    api.get<{ data: ClienteStatus[] }>(`/fechamento-cliente?year_month=${yearMonth}`)
      .then(r => {
        setClientes(r.data ?? [])
        if (customerId) {
          const current = r.data?.find(c => c.customer_id === customerId)
          setStatus(current ?? null)
        }
      })
      .catch(() => {})
  }, [yearMonth, customerId])

  useEffect(() => {
    loadClientes()
    setContratos([])
    setDespesas([])
  }, [yearMonth])

  // Atualiza status ao selecionar cliente
  useEffect(() => {
    if (!customerId) { setStatus(null); return }
    const found = clientes.find(c => c.customer_id === customerId)
    setStatus(found ?? null)
    setContratos([])
    setDespesas([])
    setTab('contratos')
  }, [customerId, clientes])

  const loadContratos = useCallback(() => {
    if (!customerId || !yearMonth) return
    setLoadingContratos(true)
    api.get<{ data: ContratoRow[] }>(`/fechamento-cliente/${customerId}/${yearMonth}/contratos`)
      .then(r => setContratos(r.data ?? []))
      .catch(() => toast.error('Erro ao carregar contratos'))
      .finally(() => setLoadingContratos(false))
  }, [customerId, yearMonth])

  const loadDespesas = useCallback(() => {
    if (!customerId || !yearMonth) return
    setLoadingDespesas(true)
    api.get<{ data: DespesaRow[] }>(`/fechamento-cliente/${customerId}/${yearMonth}/despesas`)
      .then(r => setDespesas(r.data ?? []))
      .catch(() => toast.error('Erro ao carregar despesas'))
      .finally(() => setLoadingDespesas(false))
  }, [customerId, yearMonth])

  useEffect(() => {
    if (!customerId || !yearMonth) return
    if (tab === 'contratos') loadContratos()
    if (tab === 'despesas')  loadDespesas()
    if (tab === 'resumo') {
      if (!contratos.length) loadContratos()
      if (!despesas.length)  loadDespesas()
    }
  }, [tab, customerId, yearMonth])

  // Carga inicial ao selecionar cliente
  useEffect(() => {
    if (customerId && yearMonth) loadContratos()
  }, [customerId])

  const totalServicos = contratos.reduce((s, r) => s + r.total_receita, 0)
  const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0)
  const totalGeral    = totalServicos + totalDespesas

  const handleFechar = () => {
    if (!customerId || !yearMonth) return
    setLoadingFechar(true)
    api.post(`/fechamento-cliente/${customerId}/${yearMonth}/fechar`, {})
      .then(() => { toast.success('Fechamento encerrado!'); loadClientes() })
      .catch(() => toast.error('Erro ao fechar competência'))
      .finally(() => setLoadingFechar(false))
  }

  const handleReabrir = () => {
    if (!customerId || !yearMonth) return
    setLoadingReabrir(true)
    api.post(`/fechamento-cliente/${customerId}/${yearMonth}/reabrir`, {})
      .then(() => {
        toast.success('Fechamento reaberto.')
        setContratos([])
        setDespesas([])
        loadClientes()
        loadContratos()
      })
      .catch(() => toast.error('Erro ao reabrir'))
      .finally(() => setLoadingReabrir(false))
  }

  const isClosed = status?.status === 'closed'
  const clienteOptions = clientes.map(c => ({ id: c.customer_id, name: c.nome }))

  return (
    <AppLayout title="Fechamento — Clientes">
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--brand-border)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <Building2 size={20} style={{ color: 'var(--brand-primary)' }} />
            <h1 className="text-lg font-semibold" style={{ color: 'var(--brand-text)' }}>
              Fechamento — Clientes
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
                value={customerId ?? ''}
                onChange={v => setCustomerId(v ? Number(v) : null)}
                options={clienteOptions}
                placeholder="Selecionar cliente..."
              />
              <MonthYearPicker
                month={month}
                year={year}
                onChange={(m, y) => { setMonth(m || null); setYear(y || null) }}
              />
              {isAdmin && customerId && yearMonth && !isClosed && (
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

          {/* Banner snapshot */}
          {isClosed && status && (
            <div className="mt-3 px-3 py-2 rounded text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--brand-muted)', border: '1px solid var(--brand-border)' }}>
              Dados históricos — fechado em {new Date(status.closed_at!).toLocaleDateString('pt-BR')}
              {status.closed_by_name ? ` por ${status.closed_by_name}` : ''}
            </div>
          )}
        </div>

        {!customerId ? (
          <EmptyState icon={Building2} title="Selecione um cliente" description="Escolha o cliente e a competência para visualizar o fechamento." />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-6 border-b" style={{ borderColor: 'var(--brand-border)' }}>
              {(['contratos', 'despesas', 'resumo'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    color: tab === t ? 'var(--brand-primary)' : 'var(--brand-muted)',
                    borderBottom: tab === t ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  }}
                >
                  {t === 'contratos' ? 'Contratos e Horas' : t === 'despesas' ? 'Despesas' : 'Resumo'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto">
              {/* Tab Contratos */}
              {tab === 'contratos' && (
                <div className="p-6">
                  {loadingContratos ? (
                    <SkeletonTable rows={5} cols={6} />
                  ) : contratos.length === 0 ? (
                    <EmptyState icon={Building2} title="Sem dados" description="Nenhum projeto com apontamentos aprovados neste período." />
                  ) : (
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Projeto</Th>
                          <Th>Tipo Faturamento</Th>
                          <Th right>Hs Aprov.</Th>
                          <Th right>Hs Contratadas</Th>
                          <Th right>Valor/h</Th>
                          <Th right>Total</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {contratos.map(row => (
                          <Tr key={row.projeto_id}>
                            <Td>
                              <div className="font-medium text-xs" style={{ color: 'var(--brand-text)' }}>{row.projeto_nome}</div>
                              <div className="text-xs" style={{ color: 'var(--brand-subtle)' }}>{row.projeto_codigo} · {row.tipo_contrato}</div>
                            </Td>
                            <Td>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,245,255,0.1)', color: 'var(--brand-primary)' }}>
                                {fmtTipoFaturamento(row.tipo_faturamento)}
                              </span>
                            </Td>
                            <Td right className="tabular-nums text-xs">{row.horas_aprovadas.toFixed(2)}h</Td>
                            <Td right className="tabular-nums text-xs">
                              {row.tipo_faturamento === 'banco_horas' ? `${row.horas_contratadas.toFixed(0)}h` : '—'}
                            </Td>
                            <Td right className="tabular-nums text-xs">
                              {row.tipo_faturamento === 'fechado' ? '—' : formatBRL(row.valor_base)}
                            </Td>
                            <Td right className="tabular-nums text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
                              {formatBRL(row.total_receita)}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                  {/* Rodapé total */}
                  {contratos.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <div className="text-sm font-semibold px-4 py-2 rounded" style={{ background: 'rgba(0,245,255,0.07)', color: 'var(--brand-primary)' }}>
                        Total Serviços: {formatBRL(totalServicos)}
                      </div>
                    </div>
                  )}
                  {/* Info banco de horas */}
                  {contratos.some(r => r.tipo_faturamento === 'banco_horas') && (
                    <p className="mt-3 text-xs" style={{ color: 'var(--brand-subtle)' }}>
                      * Banco de Horas: valor fixo mensal = horas contratadas × valor/h, independente do consumo.
                    </p>
                  )}
                  {/* Saldo por projeto banco de horas */}
                  {contratos.filter(r => r.tipo_faturamento === 'banco_horas').length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--brand-muted)' }}>Consumo acumulado (banco de horas)</p>
                      {contratos.filter(r => r.tipo_faturamento === 'banco_horas').map(r => {
                        const saldo = r.horas_contratadas - r.horas_consumidas
                        return (
                          <div key={r.projeto_id} className="flex gap-6 text-xs px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <span style={{ color: 'var(--brand-text)' }}>{r.projeto_nome}</span>
                            <span style={{ color: 'var(--brand-muted)' }}>Contratado: <b>{r.horas_contratadas.toFixed(0)}h</b></span>
                            <span style={{ color: 'var(--brand-muted)' }}>Consumido: <b>{r.horas_consumidas.toFixed(2)}h</b></span>
                            <span style={{ color: saldo < 0 ? 'var(--brand-danger)' : '#4ade80' }}>
                              Saldo: <b>{saldo.toFixed(2)}h</b>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Despesas */}
              {tab === 'despesas' && (
                <div className="p-6">
                  {loadingDespesas ? (
                    <SkeletonTable rows={4} cols={6} />
                  ) : despesas.length === 0 ? (
                    <EmptyState icon={Building2} title="Sem despesas" description="Nenhuma despesa cobrável aprovada neste período." />
                  ) : (
                    <Table>
                      <Thead>
                        <tr>
                          <Th>Data</Th>
                          <Th>Descrição</Th>
                          <Th>Categoria</Th>
                          <Th>Colaborador</Th>
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
                      {status?.status === 'closed' && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--brand-muted)' }}>(dados do snapshot)</span>}
                    </h3>
                    {[
                      { label: 'Total Serviços',    value: isClosed ? status!.total_servicos : totalServicos },
                      { label: 'Total Despesas',    value: isClosed ? status!.total_despesas : totalDespesas },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-sm" style={{ color: 'var(--brand-muted)' }}>
                        <span>{r.label}</span>
                        <span className="tabular-nums">{formatBRL(r.value)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-3" style={{ borderColor: 'var(--brand-border)' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--brand-text)' }}>TOTAL FATURA</span>
                        <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>
                          {formatBRL(isClosed ? status!.total_geral : totalGeral)}
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
