import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../config/api';
import { Sprout } from 'lucide-react';
import { theme } from '../styles/theme';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'farmer' | 'government'>('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', state: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const response = await authAPI.login({ email: formData.email, password: formData.password });
        if (response.error) { setError(response.error); return; }
        login(response.user, response.token);
        navigate('/dashboard');
      } else {
        const signupData = {
          name: formData.name, email: formData.email, phone: formData.phone,
          password: formData.password, role,
          ...(role === 'government' && { state: formData.state }),
        };
        const response = await authAPI.signup(signupData);
        if (response.error) { setError(response.error); return; }
        login(response.user, response.token);
        navigate('/dashboard');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: theme.colors.neutralLight,
    border: `1.5px solid ${theme.colors.neutral}`,
    borderRadius: theme.radius.md,
    color: theme.colors.text.primary,
    fontFamily: theme.fonts.body,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .auth-input:focus {
          border-color: ${theme.colors.primary} !important;
          box-shadow: 0 0 0 3px ${theme.colors.primaryMuted} !important;
        }
        .auth-input::placeholder { color: ${theme.colors.text.muted}; }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(27,94,32,0.35) !important;
        }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .auth-role-btn { transition: all 0.2s ease; }
        .auth-role-btn:hover { opacity: 0.85; }

        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-5px); }
          75%       { transform: translateX(5px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page shell — matches dashboard bg */}
      <div style={{
        minHeight: '100vh',
        background: theme.colors.neutralLight,
        display: 'flex',
        fontFamily: theme.fonts.body,
      }}>

        {/* ── Left branding panel ── */}
        <div style={{
          width: '42%',
          background: theme.colors.primaryDark,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 44px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle radial glow */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 20% 50%, rgba(74,222,128,0.12) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #4ade80, #16a34a)',
              borderRadius: theme.radius.md,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(74,222,128,0.3)',
            }}>
              <Sprout color="#fff" size={22} />
            </div>
            <span style={{
              fontFamily: theme.fonts.heading,
              fontSize: '1.6rem', fontWeight: 800,
              color: '#fff', letterSpacing: '-0.03em',
            }}>AgroPrice</span>
          </div>

          {/* Hero copy */}
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '2.5px',
              textTransform: 'uppercase', color: 'rgba(74,222,128,0.8)',
              marginBottom: 14,
            }}>Economic Intelligence Platform</div>

            <h1 style={{
              fontFamily: theme.fonts.heading,
              fontSize: '2.6rem', fontWeight: 800,
              color: '#fff', margin: '0 0 18px',
              lineHeight: 1.15, letterSpacing: '-0.03em',
            }}>
              Live telemetry for every harvest.
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.95rem', lineHeight: 1.65,
              margin: 0, maxWidth: 320,
            }}>
              Real-time MSP tracking, weather grids, fuel watch, and ML-powered market forecasts — all in one dashboard.
            </p>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              {[
                { icon: '↗', label: 'Kharif 2024', sub: 'Active season' },
                { icon: '🌾', label: '24 Crops', sub: 'MSP tracked' },
                { icon: '⛽', label: 'Fuel Watch', sub: 'Live prices' },
              ].map(p => (
                <div key={p.label} style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: theme.radius.lg,
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: theme.fonts.heading }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{p.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', position: 'relative' }}>
            © 2024 AgroPrice Intelligence · All data sourced from live APIs
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          overflow: 'auto',
        }}>
          <div style={{
            width: '100%', maxWidth: 420,
            background: theme.colors.white,
            borderRadius: theme.radius.xl,
            padding: '2.5rem',
            boxShadow: theme.shadow.elevated,
            animation: 'cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}>

            {/* Card header */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '2px',
                textTransform: 'uppercase', color: theme.colors.primary,
                marginBottom: 6,
              }}>
                {isLogin ? 'Secure Access' : 'New Registration'}
              </div>
              <h2 style={{
                fontFamily: theme.fonts.heading,
                fontSize: '1.75rem', fontWeight: 800,
                color: theme.colors.primaryDark,
                margin: 0, letterSpacing: '-0.03em',
              }}>
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ color: theme.colors.text.secondary, fontSize: 13.5, margin: '6px 0 0', fontWeight: 500 }}>
                {isLogin
                  ? 'Sign in to access your agri-intelligence dashboard.'
                  : 'Join the platform powering smarter farming decisions.'}
              </p>
            </div>

            {/* Role toggle (signup only) */}
            {!isLogin && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                background: theme.colors.neutralLight,
                padding: 5, borderRadius: theme.radius.md,
                marginBottom: '1.25rem',
              }}>
                {(['farmer', 'government'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    className="auth-role-btn"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      fontFamily: theme.fonts.body,
                      fontSize: '0.875rem', fontWeight: 700,
                      cursor: 'pointer',
                      background: role === r
                        ? (r === 'farmer' ? theme.colors.primary : '#d97706')
                        : 'transparent',
                      color: role === r ? '#fff' : theme.colors.text.muted,
                      boxShadow: role === r ? theme.shadow.card : 'none',
                    }}
                  >
                    {r === 'farmer' ? '🌾 Farmer' : '🏛️ Government'}
                  </button>
                ))}
              </div>
            )}

            {/* Fields */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {!isLogin && (
                  <>
                    <input className="auth-input" style={inputStyle} type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required />
                    <input className="auth-input" style={inputStyle} type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} required />
                  </>
                )}
                <input className="auth-input" style={inputStyle} type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} required />
                <input className="auth-input" style={inputStyle} type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
                {!isLogin && role === 'government' && (
                  <input className="auth-input" style={inputStyle} type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} required />
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: theme.radius.md,
                  padding: '0.6rem 0.875rem',
                  color: '#dc2626', fontSize: '0.8rem',
                  textAlign: 'center', marginBottom: '0.75rem',
                  animation: 'shake 0.35s ease',
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
                style={{
                  width: '100%', padding: '0.875rem',
                  border: 'none', borderRadius: theme.radius.md,
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
                  color: '#fff',
                  fontFamily: theme.fonts.body,
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(27,94,32,0.3)',
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading
                  ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Processing…</>
                  : isLogin ? 'Sign In →' : 'Create Account →'
                }
              </button>
            </form>

            {/* Divider */}
            <div style={{ height: 1, background: theme.colors.neutralLight, margin: '1.25rem 0' }} />

            {/* Switch */}
            <p style={{ textAlign: 'center', color: theme.colors.text.muted, fontSize: '0.85rem', margin: 0 }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                style={{
                  background: 'none', border: 'none',
                  color: theme.colors.primary,
                  fontFamily: theme.fonts.body,
                  fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', marginLeft: 6,
                  padding: 0, transition: 'color 0.2s',
                }}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};