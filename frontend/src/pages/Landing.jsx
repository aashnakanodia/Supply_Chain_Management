import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle, Package, Bell, ShoppingCart,
  Truck, Users, BarChart3, Shield, Activity, FileText, TrendingUp,
} from 'lucide-react'
import HexLogo from '../components/ui/HexLogo'
import './Landing.css'


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

function DashboardPreview() {
  return (
    <div className="dp-outer">
      <div className="dp-float dp-float--tl">
        <div className="dp-float-dot dp-float-dot--green" />
        <div>
          <div className="dp-float-val">PO-2847 Approved</div>
          <div className="dp-float-sub">₹8.4L · Samsung India</div>
        </div>
      </div>
      <div className="dp-float dp-float--br">
        <div className="dp-float-dot dp-float-dot--amber" />
        <div>
          <div className="dp-float-val">3 SKUs Below Reorder</div>
          <div className="dp-float-sub">Mumbai Warehouse</div>
        </div>
      </div>

      <div className="dp-browser">
        <div className="dp-chrome">
          <div className="dp-chrome-dots"><span /><span /><span /></div>
          <div className="dp-chrome-url">app.synapse.in/dashboard</div>
          <div className="dp-chrome-live"><span className="dp-live-dot" />Live</div>
        </div>

        <div className="dp-shell">
          <nav className="dp-sidebar">
            <div className="dp-sb-brand"><HexLogo size={13} /></div>
            <div className="dp-sb-items">
              <div className="dp-sb-item dp-sb-item--active"><BarChart3 size={12} /></div>
              <div className="dp-sb-item"><Package size={12} /></div>
              <div className="dp-sb-item"><ShoppingCart size={12} /></div>
              <div className="dp-sb-item"><Truck size={12} /></div>
              <div className="dp-sb-item" style={{ position: 'relative' }}>
                <Bell size={12} />
                <span className="dp-sb-badge" />
              </div>
              <div className="dp-sb-item"><Users size={12} /></div>
            </div>
          </nav>

          <div className="dp-main">
            <div className="dp-topbar">
              <div className="dp-tb-left">
                <span className="dp-tb-title">Dashboard</span>
                <span className="dp-tb-sep">/</span>
                <span className="dp-tb-org">TechVolt Electronics</span>
              </div>
              <div className="dp-tb-right">
                <div className="dp-tb-search" />
                <div className="dp-tb-bell" style={{ position: 'relative' }}>
                  <Bell size={10} />
                  <span className="dp-tb-cnt">4</span>
                </div>
                <div className="dp-tb-avatar">RK</div>
              </div>
            </div>

            <div className="dp-content">
              <div className="dp-kpis">
                <div className="dp-kpi">
                  <span className="dp-kpi-lbl">Total SKUs</span>
                  <div className="dp-kpi-val">248</div>
                  <div className="dp-kpi-d dp-kpi-d--up">↑ +12 this month</div>
                </div>
                <div className="dp-kpi dp-kpi--warn">
                  <span className="dp-kpi-lbl">Pending Approval</span>
                  <div className="dp-kpi-val">7</div>
                  <div className="dp-kpi-d dp-kpi-d--warn">Needs review</div>
                </div>
                <div className="dp-kpi">
                  <span className="dp-kpi-lbl">Open PO Value</span>
                  <div className="dp-kpi-val">₹42L</div>
                  <div className="dp-kpi-d dp-kpi-d--up">↑ 8.2% MoM</div>
                </div>
                <div className="dp-kpi dp-kpi--danger">
                  <span className="dp-kpi-lbl">Critical Alerts</span>
                  <div className="dp-kpi-val">3</div>
                  <div className="dp-kpi-d dp-kpi-d--danger">Action needed</div>
                </div>
              </div>

              <div className="dp-body">
                <div className="dp-card dp-card--table">
                  <div className="dp-card-hd">
                    <span className="dp-card-ttl">Purchase Orders</span>
                    <span className="dp-card-lnk">View all →</span>
                  </div>
                  <table className="dp-tbl">
                    <thead>
                      <tr><th>PO #</th><th>Supplier</th><th>Value</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="dp-mono">PO-2847</td>
                        <td>Samsung India</td>
                        <td className="dp-mono">₹8.4L</td>
                        <td><span className="dp-badge dp-badge--approved">Approved</span></td>
                      </tr>
                      <tr>
                        <td className="dp-mono">PO-2846</td>
                        <td>OnePlus Tech</td>
                        <td className="dp-mono">₹3.2L</td>
                        <td><span className="dp-badge dp-badge--pending">Pending</span></td>
                      </tr>
                      <tr>
                        <td className="dp-mono">PO-2845</td>
                        <td>Realme Devices</td>
                        <td className="dp-mono">₹1.8L</td>
                        <td><span className="dp-badge dp-badge--ordered">Ordered</span></td>
                      </tr>
                      <tr>
                        <td className="dp-mono">PO-2844</td>
                        <td>Boat Lifestyle</td>
                        <td className="dp-mono">₹0.9L</td>
                        <td><span className="dp-badge dp-badge--shipped">Shipped</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="dp-card dp-card--alerts">
                  <div className="dp-card-hd">
                    <span className="dp-card-ttl">Stock Alerts</span>
                    <span className="dp-alerts-cnt">4 active</span>
                  </div>
                  <div className="dp-alerts-list">
                    <div className="dp-alert-row dp-alert-row--critical">
                      <div className="dp-alert-stripe" />
                      <div className="dp-alert-info">
                        <div className="dp-alert-name">Mi 11X Pro 128GB</div>
                        <div className="dp-alert-meta">Stock: 2 · Min: 20</div>
                      </div>
                      <span className="dp-alert-tag dp-alert-tag--critical">Critical</span>
                    </div>
                    <div className="dp-alert-row dp-alert-row--high">
                      <div className="dp-alert-stripe" />
                      <div className="dp-alert-info">
                        <div className="dp-alert-name">Samsung A54 256GB</div>
                        <div className="dp-alert-meta">Stock: 8 · Min: 15</div>
                      </div>
                      <span className="dp-alert-tag dp-alert-tag--high">High</span>
                    </div>
                    <div className="dp-alert-row dp-alert-row--medium">
                      <div className="dp-alert-stripe" />
                      <div className="dp-alert-info">
                        <div className="dp-alert-name">Noise ColorFit Pro</div>
                        <div className="dp-alert-meta">Stock: 14 · Min: 25</div>
                      </div>
                      <span className="dp-alert-tag dp-alert-tag--medium">Medium</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
          <div className="lp-nav-logo-icon"><HexLogo size={42} /></div>
          <span><strong>Synapse</strong></span>
        </div>
        <div className="lp-nav-links">
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#features">Features</a>
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

export default function Landing() {
  return (
    <div className="lp">
      <Navbar />

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden />
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-eyebrow">
              <span className="lp-eyebrow-dot" />
              Supply chain management platform
            </div>
            <div className="lp-hero-brand-row">
              <div className="lp-hero-logo-icon"><HexLogo size={56} /></div>
              <span className="lp-hero-brand">Synapse</span>
            </div>
            <h1 className="lp-hero-h1">
              Procurement, inventory<br />
              and fulfilment —<br />
              <em>unified.</em>
            </h1>
            <p className="lp-hero-sub">
              Track every SKU, manage PO approvals, link shipments to purchase
              orders, and receive automated low-stock alerts — built for
              India's electronics distribution teams.
            </p>
            <div className="lp-hero-actions">
              <Link to="/auth?mode=signup" className="lp-cta-primary">
                Start for free <ArrowRight size={16} />
              </Link>
              <a href="#workflow" className="lp-cta-ghost">
                See the workflow
              </a>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>


      {/* ── Platform modules ── */}
      <section className="lp-platform" id="platform">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-head">
              <p className="lp-section-eyebrow">The Platform</p>
              <h2 className="lp-section-h2">One system. Every link in the chain.</h2>
              <p className="lp-section-desc">
                Six integrated modules — from purchase requisition to goods receipt —
                with role-based visibility enforced at the API layer.
              </p>
            </div>
          </Reveal>

          <div className="lp-modules-grid">
            {[
              {
                icon: Package,
                title: 'Inventory',
                tag: 'Core',
                desc: 'Real-time stock levels across all warehouses. Configurable reorder points, SKU-level movement logs, and automatic updates on PO receipt.',
                preview: (
                  <div className="lp-mod-preview">
                    <div className="lp-mod-row"><span className="lp-mod-sku">Samsung 4K TV 55"</span><span className="lp-mod-qty lp-mod-qty--ok">124 units</span></div>
                    <div className="lp-mod-row"><span className="lp-mod-sku">OnePlus 12R 256GB</span><span className="lp-mod-qty lp-mod-qty--warn">8 units</span></div>
                    <div className="lp-mod-row"><span className="lp-mod-sku">Mi 11X Pro 128GB</span><span className="lp-mod-qty lp-mod-qty--danger">2 units</span></div>
                  </div>
                ),
              },
              {
                icon: ShoppingCart,
                title: 'Purchase Orders',
                tag: 'Core',
                desc: 'Structured lifecycle: Draft → Admin Approval → Ordered → Received. Line-item tracking, supplier assignment, and value logging.',
                preview: (
                  <div className="lp-mod-preview">
                    <div className="lp-mod-flow">
                      {['Draft', 'Approved', 'Ordered', 'Received'].map((s, i) => (
                        <div key={s} className="lp-mod-flow-step">
                          <span className={`lp-mod-step-dot ${i < 3 ? 'lp-mod-step-dot--done' : 'lp-mod-step-dot--pending'}`} />
                          <span className="lp-mod-step-lbl">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                icon: Truck,
                title: 'Shipments',
                tag: 'Core',
                desc: 'Link inbound shipments to approved POs. Track carrier, ETD/ETA, and auto-advance inventory on goods receipt confirmation.',
                preview: (
                  <div className="lp-mod-preview">
                    <div className="lp-mod-shiprow"><span className="lp-mod-shiptag lp-mod-shiptag--transit">In Transit</span><span className="lp-mod-shipdesc">SHP-0142 · Blue Dart</span></div>
                    <div className="lp-mod-shiprow"><span className="lp-mod-shiptag lp-mod-shiptag--delivered">Delivered</span><span className="lp-mod-shipdesc">SHP-0141 · DTDC</span></div>
                    <div className="lp-mod-shiprow"><span className="lp-mod-shiptag lp-mod-shiptag--pending">Pending</span><span className="lp-mod-shipdesc">SHP-0143 · Delhivery</span></div>
                  </div>
                ),
              },
              {
                icon: Bell,
                title: 'Smart Alerts',
                tag: 'Real-time',
                desc: 'Socket.io-powered notifications. Configurable thresholds push critical, high, and medium severity alerts for stock, POs, and shipments.',
                preview: (
                  <div className="lp-mod-preview">
                    <div className="lp-mod-alert lp-mod-alert--critical"><span className="lp-mod-alert-dot" />Critical stock: Mi 11X Pro</div>
                    <div className="lp-mod-alert lp-mod-alert--warn"><span className="lp-mod-alert-dot" />PO-2846 awaiting approval</div>
                    <div className="lp-mod-alert lp-mod-alert--info"><span className="lp-mod-alert-dot" />SHP-0142 status updated</div>
                  </div>
                ),
              },
              {
                icon: Shield,
                title: 'Role-Based Access',
                tag: 'Security',
                desc: '5 roles — Admin, Procurement Manager, Warehouse Staff, Supplier, Viewer — JWT-scoped and enforced at the API layer, not just the UI.',
                preview: (
                  <div className="lp-mod-preview">
                    {[
                      { role: 'Admin', color: '#0e9f99', access: 'Full system access' },
                      { role: 'Procurement', color: '#8b5cf6', access: 'POs + Shipments' },
                      { role: 'Warehouse', color: '#f59e0b', access: 'Inventory + GRN' },
                    ].map(({ role, color, access }) => (
                      <div key={role} className="lp-mod-role-row">
                        <span className="lp-mod-role-dot" style={{ background: color }} />
                        <span className="lp-mod-role-name">{role}</span>
                        <span className="lp-mod-role-access">{access}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                icon: Activity,
                title: 'Audit Trail',
                tag: 'Compliance',
                desc: 'Immutable event log — every stock movement, PO change, login, and approval recorded with timestamp, user ID, and before/after delta.',
                preview: (
                  <div className="lp-mod-preview lp-mod-preview--log">
                    <div className="lp-mod-log"><span className="lp-mod-log-time">14:32</span><span className="lp-mod-log-evt">PO-2847 approved by r.iyer</span></div>
                    <div className="lp-mod-log"><span className="lp-mod-log-time">14:18</span><span className="lp-mod-log-evt">Stock +50 Samsung 4K TV</span></div>
                    <div className="lp-mod-log"><span className="lp-mod-log-time">13:55</span><span className="lp-mod-log-evt">SHP-0142 → In Transit</span></div>
                  </div>
                ),
              },
            ].map(({ icon: Icon, title, tag, desc, preview }, i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="lp-mod-card">
                  <div className="lp-mod-header">
                    <div className="lp-mod-icon"><Icon size={17} /></div>
                    <span className="lp-mod-tag">{tag}</span>
                  </div>
                  <h3 className="lp-mod-title">{title}</h3>
                  <p className="lp-mod-desc">{desc}</p>
                  {preview}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section className="lp-workflow" id="workflow">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-head">
              <p className="lp-section-eyebrow">Purchase Order Lifecycle</p>
              <h2 className="lp-section-h2">From requisition to goods receipt — tracked at every step.</h2>
              <p className="lp-section-desc">
                Synapse enforces a structured approval chain so nothing slips through unchecked.
              </p>
            </div>
          </Reveal>

          <div className="lp-wf-grid">
            {[
              { icon: FileText,    step: '01', title: 'Create Purchase Order', role: 'Procurement Manager', desc: 'Raise a PO with supplier, line items, quantities, and expected delivery date.' },
              { icon: CheckCircle, step: '02', title: 'Admin Approval',        role: 'Admin only',          desc: 'Admin reviews line items and approves. Status moves Draft → Approved.' },
              { icon: ShoppingCart,step: '03', title: 'Order Placed',          role: 'Auto-advance',        desc: 'On shipment creation, PO auto-advances to Ordered and supplier is notified.' },
              { icon: Truck,       step: '04', title: 'Shipment Tracked',      role: 'Procurement Manager', desc: 'Inbound shipment linked to PO. Carrier, ETD and ETA are recorded.' },
              { icon: Package,     step: '05', title: 'Goods Receipt',         role: 'Warehouse Staff',     desc: 'Warehouse marks shipment as delivered. GRN is auto-created.' },
              { icon: TrendingUp,  step: '06', title: 'Stock Updated',         role: 'Automatic',           desc: 'Inventory increments automatically. Reorder alerts recalculate against thresholds.' },
            ].map(({ icon: Icon, step, title, role, desc }, i) => (
              <Reveal key={step} delay={i * 70}>
                <div className="lp-wf-step">
                  <div className="lp-wf-step-head">
                    <div className="lp-wf-icon"><Icon size={15} /></div>
                    <span className="lp-wf-n">{step}</span>
                  </div>
                  <h3 className="lp-wf-title">{title}</h3>
                  <span className="lp-wf-role">{role}</span>
                  <p className="lp-wf-desc">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features list ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-inner">
          <Reveal>
            <div className="lp-section-head">
              <p className="lp-section-eyebrow">Capabilities</p>
              <h2 className="lp-section-h2">Built for how distribution actually works</h2>
            </div>
          </Reveal>

          <div className="lp-feat-grid">
            {[
              { icon: Package,     title: 'Multi-warehouse inventory',     desc: 'Assign products to warehouses, track per-location stock, and set warehouse-specific reorder thresholds.' },
              { icon: Bell,        title: 'Socket.io real-time alerts',    desc: 'Low stock, critical levels, PO approvals, and shipment updates pushed live — no polling, no refresh.' },
              { icon: ShoppingCart,title: 'Structured PO approval chain',  desc: 'Enforce Draft → Approved → Ordered → Received. Only Admins approve; only Procurement Managers create.' },
              { icon: Truck,       title: 'Shipment-to-PO linking',        desc: 'Every shipment references an approved PO. Auto-advance to Ordered when a shipment is created.' },
              { icon: Users,       title: 'Five-role RBAC',                desc: 'Admin, Procurement Manager, Warehouse Staff, Supplier, and Viewer — JWT-scoped, API-enforced.' },
              { icon: BarChart3,   title: 'Dashboard analytics',           desc: 'KPI cards, stock movement summaries, pending PO counts, and alert severity — all computed server-side.' },
              { icon: Shield,      title: 'JWT + refresh token auth',      desc: 'Access tokens (15 min) + refresh tokens (7 days) with secure rotation. Email-based password reset.' },
              { icon: Activity,    title: 'Immutable audit log',           desc: 'Every inventory movement, PO change, and login recorded with user, timestamp, and before/after state.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 40}>
                <div className="lp-feat-card">
                  <div className="lp-feat-icon"><Icon size={16} /></div>
                  <h3 className="lp-feat-title">{title}</h3>
                  <p className="lp-feat-desc">{desc}</p>
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
            <div className="lp-cta-logo-row">
              <div className="lp-cta-logo-icon"><HexLogo size={48} /></div>
              <span className="lp-cta-logo-name">Synapse</span>
            </div>
            <h2 className="lp-cta-h2">Ready to connect your supply chain?</h2>
            <p className="lp-cta-sub">
              Free to explore. Seed data included. Five roles, six modules, full audit trail — live in under a minute.
            </p>
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
            <div className="lp-footer-logo-icon"><HexLogo size={30} /></div>
            <span>Synapse</span>
          </div>
          <p className="lp-footer-copy">© 2026 Synapse · Made with ♥ in India</p>
          <div className="lp-footer-links">
            <a href="#platform">Platform</a>
            <a href="#workflow">Workflow</a>
            <a href="#features">Features</a>
            <Link to="/auth">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
