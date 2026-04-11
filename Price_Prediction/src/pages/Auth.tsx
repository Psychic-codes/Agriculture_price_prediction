import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../config/api';
import { Sprout } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .auth-root {
    min-height: 100vh;
    background: #0f1a0e;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .auth-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.18;
    pointer-events: none;
  }
  .auth-bg-orb-1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, #4ade80, #16a34a);
    top: -120px; left: -100px;
    animation: orbFloat1 12s ease-in-out infinite;
  }
  .auth-bg-orb-2 {
    width: 350px; height: 350px;
    background: radial-gradient(circle, #fbbf24, #d97706);
    bottom: -80px; right: -60px;
    animation: orbFloat2 15s ease-in-out infinite;
  }
  .auth-bg-orb-3 {
    width: 200px; height: 200px;
    background: radial-gradient(circle, #34d399, #059669);
    top: 50%; left: 60%;
    animation: orbFloat3 10s ease-in-out infinite;
  }

  @keyframes orbFloat1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(30px, 20px) scale(1.05); }
  }
  @keyframes orbFloat2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-20px, -30px) scale(1.08); }
  }
  @keyframes orbFloat3 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(15px, 25px); }
  }

  .auth-grain {
    position: absolute;
    inset: 0;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
  }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    padding: 2.5rem;
    backdrop-filter: blur(20px);
    box-shadow: 0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    animation: cardReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes cardReveal {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .auth-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .auth-logo-icon {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, #4ade80, #16a34a);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px rgba(74,222,128,0.3);
  }

  .auth-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, #4ade80, #a3e635);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .auth-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f0fdf4;
    text-align: center;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .auth-role-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    background: rgba(255,255,255,0.05);
    padding: 6px;
    border-radius: 12px;
    margin-bottom: 1.25rem;
  }

  .auth-role-btn {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    background: transparent;
    color: rgba(255,255,255,0.45);
  }
  .auth-role-btn.farmer-active {
    background: linear-gradient(135deg, #4ade80, #16a34a);
    color: #fff;
    box-shadow: 0 4px 12px rgba(74,222,128,0.35);
  }
  .auth-role-btn.gov-active {
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #fff;
    box-shadow: 0 4px 12px rgba(251,191,36,0.35);
  }

  .auth-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .auth-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #f0fdf4;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  .auth-input::placeholder { color: rgba(255,255,255,0.3); }
  .auth-input:focus {
    border-color: rgba(74,222,128,0.5);
    background: rgba(74,222,128,0.07);
    box-shadow: 0 0 0 3px rgba(74,222,128,0.1);
  }

  .auth-select {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #f0fdf4;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;
    box-sizing: border-box;
  }
  .auth-select option { background: #1a2e1a; color: #f0fdf4; }
  .auth-select:focus {
    border-color: rgba(251,191,36,0.5);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.1);
  }

  .auth-error {
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 8px;
    padding: 0.6rem 0.875rem;
    color: #fca5a5;
    font-size: 0.8rem;
    text-align: center;
    margin-bottom: 0.75rem;
    animation: shake 0.35s ease;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }

  .auth-submit-btn {
    width: 100%;
    padding: 0.85rem;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #4ade80, #16a34a);
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 6px 20px rgba(74,222,128,0.35);
    letter-spacing: 0.02em;
    position: relative;
    overflow: hidden;
  }
  .auth-submit-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .auth-submit-btn:hover:not(:disabled)::after { opacity: 1; }
  .auth-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(74,222,128,0.45); }
  .auth-submit-btn:active:not(:disabled) { transform: translateY(0); }
  .auth-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .auth-switch {
    text-align: center;
    margin-top: 1.25rem;
    color: rgba(255,255,255,0.4);
    font-size: 0.85rem;
  }
  .auth-switch-btn {
    background: none;
    border: none;
    color: #4ade80;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    margin-left: 0.25rem;
    transition: color 0.2s;
    padding: 0;
  }
  .auth-switch-btn:hover { color: #86efac; }

  .auth-divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 1.25rem 0;
  }
`;

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'farmer' | 'government'>('farmer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    state: '',
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
        console.log(response)
        if (response.error) { setError(response.error); return; }
        login(response.user, response.token);
        navigate(response.user.role === 'farmer' ? '/farmer' : '/government');
      } else {
        const signupData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role,
          ...(role === 'government' && { state: formData.state }),
        };
        const response = await authAPI.signup(signupData);
        if (response.error) { setError(response.error); return; }
        login(response.user, response.token);
        navigate(role === 'farmer' ? '/farmer' : '/government');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
        <div className="auth-grain" />

        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Sprout color="#fff" size={22} />
            </div>
            <span className="auth-logo-text">AgroPrice</span>
          </div>

          <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h2>

          {!isLogin && (
            <div className="auth-role-toggle">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`auth-role-btn ${role === 'farmer' ? 'farmer-active' : ''}`}
              >
                🌾 Farmer
              </button>
              <button
                type="button"
                onClick={() => setRole('government')}
                className={`auth-role-btn ${role === 'government' ? 'gov-active' : ''}`}
              >
                🏛️ Government
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              {!isLogin && (
                <>
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="auth-input"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="auth-input"
                  />
                  
                </>
              )}
              <input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} required className="auth-input" />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="auth-input" />
              {role==="government"? <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleChange} required className="auth-input" />:null}
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider" />

          <p className="auth-switch">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="auth-switch-btn"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </>
  );
};
