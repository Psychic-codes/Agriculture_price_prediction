import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function FertileDataFramework() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleActionClick = () => {
    navigate(isAuthenticated ? "/dashboard" : "/login");
  };

  return (
    <div className="font-sans text-gray-900">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-[#0d2b10]/90 backdrop-blur border-b border-white/10">
        <div className="font-bold text-white text-sm">Fertile<span className="text-green-400">Data</span> Framework</div>
        <div className="hidden md:flex gap-8 text-sm text-white/70">
          <a href="#tools">Market Prices</a>
          <a href="#tools">MSP Tracker</a>
          <a href="#tools">Fuel Prices</a>
          <a href="#greenhouse">Plant Science</a>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleActionClick}
            className="border border-white/20 text-white/80 px-4 py-1 rounded hover:bg-white/10 transition-colors"
          >
            {isAuthenticated ? "Dashboard" : "Log In"}
          </button>
          <button
            onClick={handleActionClick}
            className="bg-green-400 text-green-900 px-4 py-1 rounded font-semibold hover:bg-green-300 transition-colors"
          >
            {isAuthenticated ? "Enter App" : "Get Fertile"}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center px-6 pt-24 pb-16 bg-[#0d2b10] relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80')] bg-cover opacity-30"></div>

        <div className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <div className="mb-4 text-green-300 text-xs">● Live Mandi Data · 24 Markets</div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
              Empowering Agriculture with <span className="text-green-400">Precision Data.</span>
            </h1>
            <p className="text-white/70 mb-6">
              Real-time market insights, MSP tracking, and predictive pricing for the modern farmer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleActionClick}
                className="bg-green-400 text-green-900 px-6 py-3 rounded font-semibold hover:bg-green-300 transition-colors"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </button>
              <button className="border border-white/20 text-white px-6 py-3 rounded hover:bg-white/10 transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Volatility Card */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hidden md:block">
            <div className="text-xs text-white/50 mb-3">Market Volatility Index</div>
            <div className="text-yellow-400 font-bold mb-4">↑ 44.3%</div>
            <div className="flex items-end gap-2 h-24">
              {[30, 50, 45, 65, 55, 80, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-green-400" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section id="tools" className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Precision Tools</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Predictive Mandi Prices", icon: "📈" },
            { title: "MSP Tracker", icon: "⚖️" },
            { title: "Agri-Weather", icon: "🌤️" },
          ].map((tool, i) => (
            <div key={i} className="p-6 border rounded-xl hover:shadow">
              <div className="text-2xl mb-2">{tool.icon}</div>
              <div className="font-semibold">{tool.title}</div>
              <p className="text-sm text-gray-500 mt-1">
                Monitor and optimize agricultural decisions using real-time insights.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* GREENHOUSE */}
      <section id="greenhouse" className="bg-gray-50 px-6 py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <img
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
            className="rounded-xl"
            alt="Greenhouse"
          />

          <div>
            <h2 className="text-3xl font-bold mb-4">Grow smarter with data</h2>
            <p className="text-gray-600 mb-6">
              Our Digital Greenhouse uses 15 years of data to give predictive crop intelligence.
            </p>

            <ul className="space-y-4">
              <li>✔ Real-time price intelligence</li>
              <li>✔ Predictive forecasting engine</li>
              <li>✔ Smart alerts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-green-800 to-green-900 text-white px-6 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Ready to harvest better <span className="text-green-400">profits?</span>
        </h2>
        <p className="text-white/70 mb-6">
          Join thousands of farmers using data to improve outcomes.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleActionClick}
            className="bg-green-400 text-green-900 px-6 py-3 rounded hover:bg-green-300 transition-colors font-semibold"
          >
            {isAuthenticated ? "Go to Dashboard" : "Join Today"}
          </button>
          <button className="border border-white/20 px-6 py-3 rounded hover:bg-white/10 transition-colors">
            Request Demo
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0d2b10] text-white/60 px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>Fertile<span className="text-green-400">Data</span> Framework</div>
        <div className="text-sm">© 2025 FertileData</div>
      </footer>
    </div>
  );
}
