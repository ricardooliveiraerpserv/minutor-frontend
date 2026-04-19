'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api'

function MinutorIcon({ size = 32 }: { size?: number }) {
  const bars = [
    { x: 0,    h: 0.45, y: 0.55 },
    { x: 0.28, h: 0.75, y: 0.25 },
    { x: 0.56, h: 1.00, y: 0.00 },
    { x: 0.84, h: 0.60, y: 0.40 },
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x * 28 * 0.9 + 2} y={b.y * 20 + 4} width={4.2} height={b.h * 20} rx={1.6} fill="#00F5FF" />
      ))}
    </svg>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordChanged = searchParams.get('senha_alterada') === '1'
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPass] = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { requiresPasswordChange } = await login(email, password)
      router.replace(requiresPasswordChange ? '/alterar-senha' : '/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.11)',
    color: 'white',
  }
  const focusStyle = {
    border: '1px solid rgba(0,245,255,0.5)',
    boxShadow: '0 0 0 3px rgba(0,245,255,0.08)',
    background: 'rgba(255,255,255,0.08)',
  }
  const blurStyle = {
    border: '1px solid rgba(255,255,255,0.11)',
    boxShadow: 'none',
    background: 'rgba(255,255,255,0.06)',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {passwordChanged && (
        <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: '#4ade80' }}>
          Senha alterada com sucesso. Faça login com a nova senha.
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value.toLowerCase())}
          placeholder="seu@email.com"
          required
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150 placeholder:text-zinc-700"
          style={inputStyle}
          onFocus={e => Object.assign(e.target.style, focusStyle)}
          onBlur={e => Object.assign(e.target.style, blurStyle)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Senha
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all duration-150 placeholder:text-zinc-700"
            style={inputStyle}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => Object.assign(e.target.style, blurStyle)}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            tabIndex={-1}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
          style={{
            background: 'linear-gradient(160deg, #4338CA 0%, #4F46E5 100%)',
            color: 'white',
            boxShadow: loading ? 'none' : '0 2px 8px rgba(67,56,202,0.4), 0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width={13} height={13} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
              </svg>
              Entrando...
            </span>
          ) : 'Entrar'}
        </button>
      </div>

      <div className="text-center">
        <Link href="/esqueci-senha" className="text-xs transition-colors hover:opacity-60" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Esqueceu a senha?
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0B' }}>

      {/* Glow radial sutil */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div style={{
          width: 700,
          height: 500,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,245,255,0.045) 0%, transparent 65%)',
          filter: 'blur(24px)',
        }} />
      </div>

      <div className="w-full max-w-[360px] relative px-4" style={{ animation: 'fadeUp 0.35s ease both' }}>

        {/* Card */}
        <div className="rounded-2xl px-8 py-8" style={{
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05) inset',
        }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <MinutorIcon size={32} />
            <div>
              <p className="text-[15px] font-semibold tracking-[0.08em] text-white uppercase leading-none">
                Minutor
              </p>
              <p className="text-[11px] mt-0.5 tracking-wide leading-none" style={{ color: 'rgba(0,245,255,0.55)' }}>
                Gestão de Projetos e Serviços
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6" style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

          {/* Form */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        {/* ERPServ — discreto no rodapé */}
        <div className="flex justify-center mt-9">
          <Image
            src="/logo.png"
            alt="ERPServ Consultoria"
            width={60}
            height={22}
            className="object-contain"
            style={{ filter: 'grayscale(1) invert(1) brightness(10)', opacity: 0.14 }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
