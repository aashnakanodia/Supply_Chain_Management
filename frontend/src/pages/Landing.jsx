import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight, CheckCircle, Package, Bell, ShoppingCart, Truck, Users, BarChart3, ChevronRight } from 'lucide-react'
import './Landing.css'

/* ── Animated counter ──────────────────────────────────────────────────── */
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = Math.ceil(to / 60)
      const t = setInterval(() => {
        start = Math.min(start + step, to)
        setVal(start)
        if (start >= to) clearInterval(t)
      }, 16)
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString('en-IN')}{suffix}</span>
}

/* ── Scroll reveal ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        obs.disconnect()
      }
    }, { threshold: 0.1 })
    el.style.opacity = '0'
    el.style.transform = 'translateY(24px)'
    el.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])
  return <div ref={ref}>{children}</div>
}

/* ── Dashboard mockup (hero visual) ───────────────────────────────────── */
function DashboardMockup() {
  return (
    <div className="lp-mockup-wrap">
      <div className="lp-mockup">
        {/* browser chrome */}
        <div className="lp-mockup-chrome">
          <div className="lp-mockup-dots">
            <span /><span /><span />
          </div>
          <div className="lp-mockup-url">app.synapse.in/dashboard</div>
        </div>
        {/* app shell */}
        <div className="lp-mockup-app">
          {/* sidebar */}
          <div className="lp-mockup-sidebar">
            <div className="lp-mockup-logo"><span>⚡</span></div>
            <div className="lp-mockup-nav-items">
              <div className="lp-nav-item lp-nav-item--active"><BarChart3 size={13} /></div>
              <div className="lp-nav-item"><Package size={13} /></div>
              <div className="lp-nav-item"><ShoppingCart size={13} /></div>
              <div className="lp-nav-item"><Truck size={13} /></div>
              <div className="lp-nav-item" style={{ position: 'relative' }}>
                <Bell size={13} />
                <span className="lp-nav-dot" />
              </div>
            </div>
          </div>
          {/* main */}
          <div className="lp-mockup-main">
            <div className="lp-mockup-topbar">
              <span className="lp-topbar-title">Dashboard</span>
              <div className="lp-topbar-right">
                <div className="lp-topbar-search" />
                <div className="lp-topbar-avatar">RK</div>
              </div>
            </div>
            <div className="lp-mockup-content">
              {/* KPI row */}
              <div className="lp-kpis">
                <div className="lp-kpi">
                  <div className="lp-kpi-val">248</div>
                  <div className="lp-kpi-lbl">Products</div>
                </div>
                <div className="lp-kpi lp-kpi--warn">
                  <div className="lp-kpi-val">12</div>
                  <div className="lp-kpi-lbl">Low Stock</div>
                </div>
                <div className="lp-kpi">
                  <div className="lp-kpi-val">₹4.2L</div>
                  <div className="lp-kpi-lbl">Pending POs</div>
                </div>
                <div className="lp-kpi lp-kpi--danger">
                  <div className="lp-kpi-val">3</div>
                  <div className="lp-kpi-lbl">Alerts</div>
                </div>
              </div>
              {/* charts row */}
              <div className="lp-charts-row">
                <div className="lp-chart-card">
                  <div className="lp-chart-title">Recent Activity</div>
                  <div className="lp-table">
                    <div className="lp-tr">
                      <span className="lp-td-name">Samsung 4K Monitor</span>
                      <span className="lp-tag lp-tag-in">IN</span>
                      <span className="lp-td-qty lp-qty-in">+50</span>
                    </div>
                    <div className="lp-tr">
                      <span className="lp-td-name">OnePlus Pad 2</span>
                      <span className="lp-tag lp-tag-out">OUT</span>
                      <span className="lp-td-qty lp-qty-out">−12</span>
                    </div>
                    <div className="lp-tr">
                      <span className="lp-td-name">Realme Buds Air Pro</span>
                      <span className="lp-tag lp-tag-in">IN</span>
                      <span className="lp-td-qty lp-qty-in">+30</span>
                    </div>
                  </div>
                </div>
                <div className="lp-chart-card">
                  <div className="lp-chart-title">Alert Summary</div>
                  <div className="lp-alert-list">
                    <div className="lp-alert-row">
                      <span className="lp-dot lp-dot-critical" />
                      <span className="lp-alert-lbl">Critical</span>
                      <span className="lp-alert-cnt">2</span>
                    </div>
                    <div className="lp-alert-row">
                      <span className="lp-dot lp-dot-high" />
                      <span className="lp-alert-lbl">High</span>
                      <span className="lp-alert-cnt">7</span>
                    </div>
                    <div className="lp-alert-row">
                      <span className="lp-dot lp-dot-medium" />
                      <span className="lp-alert-lbl">Medium</span>
                      <span className="lp-alert-cnt">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* glow */}
      <div className="lp-mockup-glow" />
    </div>
  )
}

/* ── Navbar ────────────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
      <div className="lp-nav-inner">
        <div className="lp-nav-logo">
          <div className="lp-nav-logo-icon"><Zap size={15} /></div>
          <span><strong>Synapse</strong></span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="lp-nav-actions">
          <Link to="/auth" className="lp-btn-ghost">Log in</Link>
          <Link to="/auth?mode=signup" className="lp-btn-orange">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ── Features data ─────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Package,
    title: 'Real-time inventory tracking',
    desc: 'Live stock levels across every warehouse. Reorder alerts fire automatically — before you run out.',
    large: true,
  },
  {
    icon: Bell,
    title: 'Automated alerts',
    desc: 'Low stock, critical levels, and PO events pushed instantly. Zero manual checking.',
  },
  {
    icon: ShoppingCart,
    title: 'Purchase order lifecycle',
    desc: 'Draft → approve → order → receive, with every step tracked and audit-logged.',
  },
  {
    icon: Truck,
    title: 'Shipment tracking',
    desc: 'Link shipments to POs, track carrier status, and auto-credit inventory on receipt.',
  },
  {
    icon: Users,
    title: 'Role-based access',
    desc: 'Admin, procurement, warehouse staff, supplier, and viewer — each scoped to exactly what they need.',
  },
  {
    icon: BarChart3,
    title: 'Full audit trail',
    desc: 'Every stock movement, PO change, and login recorded with timestamp and user attribution.',
  },
]

const STEPS = [
  { n: '01', title: 'Set up warehouses & suppliers',   desc: 'Add your warehouses across India and onboard your supplier network in minutes.' },
  { n: '02', title: 'Import your product catalogue',   desc: 'Add SKUs, set reorder points, and assign products to warehouses.' },
  { n: '03', title: 'Track inventory in real time',    desc: 'Live dashboard shows stock levels, movements, and low-stock warnings across all locations.' },
  { n: '04', title: 'Act on automated insights',       desc: 'Alerts fire, POs get approved, shipments update — your team always knows exactly where things stand.' },
]

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="lp">
      <Navbar />

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden />
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <span className="lp-badge-dot" />
              Built for Indian electronics distributors
            </div>
            <h1 className="lp-hero-h1">
              Supply chain clarity,<br />
              <em>at every node.</em>
            </h1>
            <p className="lp-hero-sub">
              Real-time inventory, automated alerts, and streamlined
              procurement — all in one platform designed for the
              way India's electronics supply chain actually works.
            </p>
            <div className="lp-hero-actions">
              <Link to="/auth?mode=signup" className="lp-cta-primary">
                Start for free <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="lp-cta-ghost">
                See how it works
              </a>
            </div>
            <div className="lp-hero-checks">
              {['No credit card required', 'Free demo data included', '5 roles out of the box'].map((t) => (
                <span key={t} className="lp-check">
                  <CheckCircle size={13} /> {t}
                </span>
              ))}
            </div>
          </div>
          <DashboardMockup />
        </div>
      </section>


      {/* ── Features ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-head">
              <p className="lp-section-eyebrow">Features</p>
              <h2 className="lp-section-h2">Everything your supply chain needs</h2>
              <p className="lp-section-desc">
                From warehouse to delivery, Synapse connects every node of your operations.
              </p>
            </div>
          </Reveal>

          <div className="lp-features-grid">
            {FEATURES.map(({ icon: Icon, title, desc, large }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className={`lp-feature-card ${large ? 'lp-feature-card--large' : ''}`}>
                  <div className="lp-feature-icon"><Icon size={20} /></div>
                  <h3 className="lp-feature-title">{title}</h3>
                  <p className="lp-feature-desc">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-hiw" id="how-it-works">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-head">
              <p className="lp-section-eyebrow">How it works</p>
              <h2 className="lp-section-h2">Up and running in four steps</h2>
            </div>
          </Reveal>

          <div className="lp-steps">
            {STEPS.map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 80}>
                <div className="lp-step">
                  <div className="lp-step-num">{n}</div>
                  <div className="lp-step-body">
                    <h3 className="lp-step-title">{title}</h3>
                    <p className="lp-step-desc">{desc}</p>
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight size={18} className="lp-step-arrow" />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-inner">
          <Reveal>
            <h2 className="lp-cta-h2">Ready to bring clarity to your supply chain?</h2>
            <p className="lp-cta-sub">Join distributors across India who track stock, approve POs, and ship faster — all from one dashboard.</p>
            <div className="lp-cta-row">
              <Link to="/auth?mode=signup" className="lp-cta-primary">
                Create free account <ArrowRight size={16} />
              </Link>
              <Link to="/auth" className="lp-cta-ghost-light">
                Sign in to existing account
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <div className="lp-footer-logo-icon"><Zap size={13} /></div>
            <span>Synapse</span>
          </div>
          <p className="lp-footer-copy">
            © 2026 Synapse · Made with ♥ in India
          </p>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link to="/auth">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
