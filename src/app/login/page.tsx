'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api'

function MinutorIcon({ size = 52 }: { size?: number }) {
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

  const inputBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.055)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'white',
    borderRadius: 12,
    width: '100%',
    padding: '13px 16px',
    fontSize: 14,
    outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s, background 0.15s',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {passwordChanged && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: '#4ade80' }}>
          Senha alterada com sucesso. Faça login com a nova senha.
        </div>
      )}

      {/* E-mail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value.toLowerCase())}
          placeholder="seu@email.com"
          required
          style={{ ...inputBase, caretColor: '#00F5FF' }}
          className="login-input"
        />
      </div>

      {/* Senha */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          Senha
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{ ...inputBase, paddingRight: 44, caretColor: '#00F5FF' }}
            className="login-input"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            tabIndex={-1}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="login-btn"
        style={{
          width: '100%',
          padding: '15px',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          color: 'white',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          background: 'linear-gradient(160deg, #3730A3 0%, #4F46E5 60%, #6366F1 100%)',
          boxShadow: '0 6px 24px rgba(79,70,229,0.45), 0 2px 6px rgba(0,0,0,0.5)',
          transition: 'all 0.2s',
          letterSpacing: '0.02em',
        }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg style={{ animation: 'spin 0.8s linear infinite' }} width={14} height={14} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
            </svg>
            Entrando...
          </span>
        ) : 'Entrar'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <Link href="/esqueci-senha" style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          Esqueceu a senha?
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080B12', position: 'relative', overflow: 'hidden' }}>

      {/* Glow atmosférico — fundo */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,245,255,0.04) 0%, transparent 65%)', filter: 'blur(30px)' }} />
      </div>

      {/* Card */}
      <div style={{ animation: 'fadeUp 0.4s ease both', width: '100%', maxWidth: 420, padding: '0 20px', position: 'relative' }}>
        <div style={{
          borderRadius: 20,
          padding: '44px 40px 36px',
          background: 'rgba(18,20,28,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>

          {/* Header — CENTRALIZADO */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <MinutorIcon size={52} />
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FFFFFF', lineHeight: 1 }}>
              Minutor
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#00D4E8', letterSpacing: '0.02em', fontWeight: 400 }}>
              Gestão de Projetos e Serviços
            </p>
          </div>

          {/* Divider com accent central */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1))' }} />
            <div style={{ width: 28, height: 2, borderRadius: 2, background: '#00D4E8', margin: '0 10px', opacity: 0.7 }} />
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.1))' }} />
          </div>

          {/* Form */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Rodapé — ERPServ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 28, opacity: 0.38 }}>
          <Image
            src="/logo.png"
            alt="ERPServ"
            width={72}
            height={28}
            style={{ objectFit: 'contain', filter: 'grayscale(1) invert(1) brightness(10)' }}
          />
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.25)' }} />
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
            Uma solução{' '}
            <span style={{ color: '#00D4E8', fontWeight: 600 }}>erpserv.</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-input::placeholder { color: rgba(255,255,255,0.22); }
        .login-input:focus {
          border: 1px solid rgba(0,212,232,0.55) !important;
          box-shadow: 0 0 0 3px rgba(0,212,232,0.08) !important;
          background: rgba(255,255,255,0.075) !important;
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 8px 32px rgba(79,70,229,0.55), 0 2px 6px rgba(0,0,0,0.5);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}
