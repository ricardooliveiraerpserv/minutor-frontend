'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'

export interface MultiSelectOption { id: number | string; name: string }

export function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  wide,
  fullWidth,
  disabled,
}: {
  label?: string
  value: string[]
  onChange: (v: string[]) => void
  options: MultiSelectOption[]
  placeholder: string
  wide?: boolean
  fullWidth?: boolean
  disabled?: boolean
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [pos,   setPos]   = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  )

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  const triggerLabel = value.length === 0
    ? placeholder
    : value.length === 1
      ? (options.find(o => String(o.id) === value[0])?.name ?? `1 selecionado`)
      : `${value.length} selecionados`

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', h)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', h)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const openDropdown = () => {
    if (open) { setOpen(false); return }
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const dropW = fullWidth ? r.width : Math.max(r.width, wide ? 240 : 200)
    const left = Math.min(r.left, window.innerWidth - dropW - 8)
    setPos({ top: r.bottom + 4, left: Math.max(8, left), width: dropW })
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--brand-subtle)' }}>
          {label}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm outline-none text-left disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : wide ? 'min-w-52' : 'min-w-36'}`}
        style={{
          background: 'var(--brand-bg)',
          border: `1px solid ${value.length > 0 ? 'var(--brand-primary)' : 'var(--brand-border)'}`,
          color: value.length > 0 ? 'var(--brand-text)' : 'var(--brand-subtle)',
        }}
      >
        <span className="truncate text-sm">{triggerLabel}</span>
        <ChevronDown size={13} style={{ color: 'var(--brand-subtle)', flexShrink: 0 }} />
      </button>

      {open && pos && (
        <div
          ref={ref}
          className="rounded-xl shadow-2xl overflow-hidden"
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
            zIndex: 9999, background: 'var(--brand-surface)', border: '1px solid var(--brand-border)',
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--brand-border)' }}>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--brand-subtle)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', color: 'var(--brand-text)' }}
              />
            </div>
          </div>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-white/5 transition-colors"
              style={{ color: 'var(--brand-primary)', borderBottom: '1px solid var(--brand-border)' }}>
              Limpar seleção
            </button>
          )}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="px-3 py-2 text-xs" style={{ color: 'var(--brand-subtle)' }}>Nenhum resultado</p>
              : filtered.map(o => {
                  const checked = value.includes(String(o.id))
                  return (
                    <button key={o.id} type="button" onClick={() => toggle(String(o.id))}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                      style={{ color: checked ? 'var(--brand-primary)' : 'var(--brand-text)' }}>
                      <span className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border"
                        style={{ borderColor: checked ? 'var(--brand-primary)' : 'rgba(255,255,255,0.2)', background: checked ? 'var(--brand-primary)' : 'transparent' }}>
                        {checked && <Check size={9} color="#0A0A0B" strokeWidth={3} />}
                      </span>
                      {o.name}
                    </button>
                  )
                })}
          </div>
        </div>
      )}
    </div>
  )
}
