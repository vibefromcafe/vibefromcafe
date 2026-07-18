import { useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowDownRight,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  Coffee,
  Code2,
  Cpu,
  Database,
  MapPin,
  Menu,
  MessageCircle,
  Sparkles,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import {
  heroProofPoints,
  publicChapters,
  publicProductExamples,
} from '../data/public-claims'

const proofIcons = {
  users: Users,
  coffee: Coffee,
  map: MapPin,
} as const

const principles = [
  {
    index: '/01',
    title: 'Learn in public',
    copy: 'No polished expert persona required. Bring the thing you are learning and make it legible to someone else.',
    icon: Sparkles,
  },
  {
    index: '/02',
    title: 'Build small, ship often',
    copy: 'Turn AI curiosity into working prototypes. You leave every session with something more real than a bookmark.',
    icon: Code2,
  },
  {
    index: '/03',
    title: 'Share the shortcut',
    copy: 'The best prompt, workflow, and hard-earned mistake gets passed around the table. Everyone levels up faster.',
    icon: Zap,
  },
]

const communityNames = ['designers', 'engineers', 'founders', 'marketers', 'researchers', 'the curious']
const tickerNames = Array.from({ length: 4 }, () => communityNames).flat()

const footerNavigation = [
  { label: 'Cafes', href: 'https://cafein.id', external: true },
  { label: 'Chapters', to: '/chapters' },
  { label: 'Events', to: '/events' },
  { label: 'About', to: '/about' },
  { label: 'Join', to: '/join' },
]

const footerConnect = [
  { label: 'X (@vibefromcafe)', href: 'https://x.com/vibefromcafe' },
  { label: 'Instagram (@vibefromcafe)', href: 'https://www.instagram.com/vibefromcafe' },
  { label: 'GitHub (@vibefromcafe)', href: 'https://github.com/vibefromcafe' },
]

const services = [
  {
    index: '/01',
    title: 'AI Assistant & Chatbot',
    copy: 'Customer support, sales assistant, dan internal copilot yang paham konteks bisnis Anda.',
    deliverables: ['WhatsApp & web', 'Human handoff', 'Analytics'],
    icon: Bot,
  },
  {
    index: '/02',
    title: 'Workflow Automation',
    copy: 'Hubungkan tools, data, dan approval agar pekerjaan repetitif berjalan tanpa dipindah manual.',
    deliverables: ['Lead routing', 'Document ops', 'Notifications'],
    icon: Workflow,
  },
  {
    index: '/03',
    title: 'Custom LLM & RAG',
    copy: 'Jadikan dokumen dan knowledge base perusahaan sebagai jawaban yang cepat dan terverifikasi.',
    deliverables: ['Semantic search', 'Citations', 'Access control'],
    icon: Database,
  },
  {
    index: '/04',
    title: 'Custom AI Product',
    copy: 'Dari prototype hingga produk yang dipakai sehari-hari—kami merancang solusi AI sesuai proses dan pengguna Anda.',
    deliverables: ['Product design', 'Engineering', 'Handover'],
    icon: BrainCircuit,
  },
]

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand-mark" to="/" aria-label="Vibe Coding From Cafe home">
      <span className="brand-icon"><Coffee size={compact ? 18 : 22} strokeWidth={2.6} /></span>
      <span className={compact ? 'hidden sm:inline' : ''}>Vibe Coding From Cafe</span>
    </Link>
  )
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main id="top" className="overflow-hidden">
      <section className="hero-grid relative min-h-[780px] bg-midnight text-white">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-midnight/90 backdrop-blur-xl">
          <nav className="page-shell flex h-20 items-center justify-between" aria-label="Main navigation">
            <BrandMark />
            <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <a className="nav-link" href="https://cafein.id" target="_blank" rel="noreferrer">Cafes</a>
              <Link className="nav-link" to="/chapters">Chapters</Link>
              <Link className="nav-link" to="/events">Events</Link>
              <Link className="nav-link" to="/about">About</Link>
              <Link className="button button-small bg-yellow text-midnight" to="/join">Join</Link>
            </div>
            <button
              className="grid size-11 place-items-center rounded-lg border border-white/15 md:hidden"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </nav>

          {menuOpen ? (
            <div className="page-shell border-t border-white/10 py-6 md:hidden">
              <div className="flex flex-col gap-5 text-lg">
                <a href="https://cafein.id" target="_blank" rel="noreferrer">Cafes</a>
                <Link to="/chapters" onClick={() => setMenuOpen(false)}>Chapters</Link>
                <Link to="/events" onClick={() => setMenuOpen(false)}>Events</Link>
                <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
                <Link className="text-yellow" to="/join" onClick={() => setMenuOpen(false)}>Join community →</Link>
              </div>
            </div>
          ) : null}
        </header>

        <div className="page-shell relative z-10 grid items-center gap-16 pb-24 pt-20 lg:grid-cols-[1.1fr_.9fr] lg:pb-28 lg:pt-24">
          <div>
            <div className="eyebrow mb-7"><span className="status-dot" /> Community-powered AI studio</div>
            <h1 className="hero-title max-w-[780px]">
              Learn AI together. Build AI that <span className="highlight-chip">works.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
              Vibe Coding From Cafe adalah komunitas pengguna AI sekaligus AI studio—tempat praktisi belajar bersama dan membantu bisnis membangun solusi yang benar-benar dipakai.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link className="button button-primary" to="/contact">Build AI with us <ArrowRight size={18} /></Link>
              <Link className="button button-ghost" to="/join"><Users size={17} /> Join the community</Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-white/50">
              {heroProofPoints.map((point) => {
                const Icon = proofIcons[point.icon]
                return (
                  <span key={point.label} className="flex items-center gap-2">
                    <Icon size={17} className="text-yellow" /> {point.label}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px] lg:ml-auto">
            <div className="absolute -inset-12 rounded-full bg-yellow/15 blur-3xl" />
            <div className="event-card relative rotate-[1.5deg]">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 font-mono text-[11px] font-bold uppercase tracking-[.18em]">
                <span>Service example / 01</span>
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#f5c400]" /> Concept</span>
              </div>
              <div className="p-6 sm:p-8">
                <div className="mb-10 flex items-start justify-between gap-5">
                  <span className="grid size-14 place-items-center rounded-xl bg-midnight text-yellow"><Cpu size={28} /></span>
                  <span className="rounded-full border border-black/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">AI customer service</span>
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-[.15em] text-black/55">KopiChat</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Customer questions, answered with context.</h2>
                <div className="mt-8 grid gap-3 border-t border-black/10 pt-5 text-sm sm:grid-cols-2">
                  <span className="flex items-center gap-2"><Bot size={16} /> WhatsApp + Web</span>
                  <span className="flex items-center gap-2"><Check size={16} /> Human handoff</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-5 -rotate-6 rounded-lg border-2 border-midnight bg-white px-4 py-3 font-mono text-xs font-bold text-midnight shadow-[6px_6px_0_#17131f] sm:-left-10">
              example pattern,<br />built around your workflow
            </div>
          </div>
        </div>
      </section>

      <div className="ticker border-y border-white/10 bg-midnight py-4 text-white">
        <div className="ticker-track font-mono text-xs font-bold uppercase tracking-[.22em]">
          {[0, 1].map((group) => (
            <div key={group} className="ticker-group">
              {tickerNames.map((name, index) => (
                <span key={`${group}-${name}-${index}`} className="flex items-center gap-6 whitespace-nowrap"><Sparkles size={14} /> {name}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="community" className="bg-paper py-24 text-midnight md:py-32">
        <div className="page-shell">
          <div className="mx-auto max-w-4xl text-center">
            <p className="section-label">/ ONE SHARED ECOSYSTEM</p>
            <h2 className="section-title mt-5">Satu ekosistem. Dua cara untuk tumbuh <span className="underline-sketch">bersama.</span></h2>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-ink-muted">Komunitas mengasah kemampuan kami. Project nyata mempertajam pengetahuan komunitas. Keduanya saling menghidupkan.</p>
          </div>

          <div className="relative mt-16 grid gap-5 lg:grid-cols-2">
            <article className="ecosystem-card bg-white">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-black/45">/ Community</span>
                <span className="grid size-12 place-items-center rounded-lg bg-yellow text-midnight"><Users size={23} /></span>
              </div>
              <h3 className="mt-12 max-w-md text-3xl font-semibold leading-tight">Belajar, bereksperimen, dan berkembang bersama pengguna AI lainnya.</h3>
              <ul className="mt-8 space-y-4 text-sm text-ink-muted">
                {['Cafe meetups dan build sessions', 'Knowledge sharing tanpa gatekeeping', 'Kolaborasi lintas profesi dan kota'].map((item) => <li key={item} className="flex items-center gap-3"><Check size={16} className="text-midnight" strokeWidth={3} /> {item}</li>)}
              </ul>
              <Link className="mt-9 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4" to="/chapters">Temukan chapter Anda <ArrowRight size={16} /></Link>
            </article>

            <div className="ecosystem-connector" aria-hidden="true">↔</div>

            <article className="ecosystem-card bg-midnight text-white">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[.18em] text-white/45">/ AI Studio</span>
                <span className="grid size-12 place-items-center rounded-lg bg-white text-midnight"><BrainCircuit size={23} /></span>
              </div>
              <h3 className="mt-12 max-w-md text-3xl font-semibold leading-tight">Menerapkan kemampuan komunitas untuk menyelesaikan masalah bisnis nyata.</h3>
              <ul className="mt-8 space-y-4 text-sm text-white/60">
                {['Discovery dari masalah, bukan tren', 'Design dan engineering end-to-end', 'Dirancang untuk dipakai di alur kerja nyata'].map((item) => <li key={item} className="flex items-center gap-3"><Check size={16} className="text-yellow" strokeWidth={3} /> {item}</li>)}
              </ul>
              <Link className="mt-9 inline-flex items-center gap-2 text-sm font-bold text-white underline underline-offset-4" to="/contact">Diskusikan project AI <ArrowRight size={16} /></Link>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-black/50">
            <span>Community insight</span><ArrowRight size={13} /><span>Real-world practice</span><ArrowRight size={13} /><span>Better AI products</span><ArrowRight size={13} /><span>Shared learning</span>
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-24 text-midnight md:py-32">
        <div className="page-shell">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="section-label">/ AI SERVICES</p>
              <Link className="mt-8 hidden items-center gap-2 text-sm font-bold underline underline-offset-4 lg:inline-flex" to="/contact">Ceritakan kebutuhan Anda <ArrowRight size={16} /></Link>
            </div>
            <div>
              <h2 className="section-title max-w-4xl">Dari masalah operasional menjadi produk AI yang <span className="underline-sketch">benar-benar dipakai.</span></h2>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-muted">Bukan sekadar slide deck. Kami membantu menemukan use case, merancang pengalaman, membangun sistem, dan menyesuaikannya dengan cara kerja tim Anda.</p>
            </div>
          </div>

          <div className="mt-16 grid overflow-hidden rounded-2xl border border-black/10 md:grid-cols-2">
            {services.map(({ index, title, copy, deliverables, icon: Icon }) => (
              <article key={index} className="service-card group border-black/10 p-7 md:p-9">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-widest text-black/45">{index}</span>
                  <span className="grid size-12 place-items-center rounded-lg bg-midnight text-white transition-transform group-hover:-rotate-3"><Icon size={22} /></span>
                </div>
                <h3 className="mt-10 text-2xl font-semibold">{title}</h3>
                <p className="mt-4 max-w-md leading-7 text-ink-muted">{copy}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {deliverables.map((item) => <span key={item} className="rounded border border-black/10 bg-[#f7f7f8] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">{item}</span>)}
                </div>
              </article>
            ))}
          </div>
          <Link className="mt-8 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4 lg:hidden" to="/contact">Ceritakan kebutuhan Anda <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section id="showcase" className="showcase-grid relative bg-deep py-24 text-white md:py-32">
        <div className="page-shell relative z-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="section-label text-yellow">/ SERVICE EXAMPLES</p>
              <h2 className="section-title mt-5 max-w-3xl">Pola solusi, bukan klaim produk live.</h2>
            </div>
            <p className="max-w-sm leading-7 text-white/60">Contoh pendekatan yang kami sesuaikan dengan data, workflow, dan cara kerja bisnis Anda—bukan katalog produk yang sudah di-deploy.</p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {publicProductExamples.map((product) => (
              <article key={product.code} className="product-card">
                <div className="product-preview">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-white/45">
                    <span>{product.code}</span><span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${product.accent}`} /> {product.statusLabel}</span>
                  </div>
                  {product.preview === 'chat' ? (
                    <div className="space-y-3 p-5 text-xs">
                      <div className="mr-8 rounded-lg rounded-tl-sm bg-white/8 p-3 text-white/65">Apakah pesanan saya sudah dikirim?</div>
                      <div className="ml-8 rounded-lg rounded-tr-sm bg-yellow p-3 text-midnight">Sudah. Estimasi tiba besok sebelum sore, berdasarkan data pesanan.</div>
                      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-white/35"><span className="size-1.5 animate-pulse rounded-full bg-yellow" /> answered from order data</div>
                    </div>
                  ) : null}
                  {product.preview === 'flow' ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5 text-center font-mono text-[9px] uppercase tracking-wider">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4">New lead</div><ArrowRight size={14} className="text-yellow" /><div className="rounded-lg border border-white/10 bg-white/5 p-4">Qualified</div>
                      <div className="col-span-3 mx-auto h-5 w-px bg-white/15" />
                      <div className="col-span-3 mx-auto rounded-lg bg-[#fa7faa] px-5 py-3 font-bold text-midnight">Sales notified ✓</div>
                    </div>
                  ) : null}
                  {product.preview === 'search' ? (
                    <div className="p-5">
                      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/45"><Sparkles size={14} className="text-yellow" /> Ringkas SOP refund enterprise…</div>
                      <div className="mt-3 rounded-lg bg-white p-4 text-xs leading-5 text-midnight"><strong>Refund enterprise memerlukan 2 tahap approval.</strong><br /><span className="text-black/50">Sumber: SOP Finance v3.2 · halaman 8</span></div>
                    </div>
                  ) : null}
                </div>
                <div className="p-6 md:p-7">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-white/40">{product.category}</p>
                  <h3 className="mt-3 text-3xl font-semibold">{product.name}</h3>
                  <p className="mt-4 leading-7 text-white/55">{product.copy}</p>
                  <div className="mt-6 flex flex-wrap gap-2">{product.tags.map((tag) => <span key={tag} className="rounded border border-white/10 px-2.5 py-1.5 text-[10px] text-white/55">{tag}</span>)}</div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-xl border border-white/10 bg-midnight p-6 sm:flex-row sm:items-center md:p-8">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-yellow">Punya use case berbeda?</p><p className="mt-2 text-xl font-semibold">Kita bisa mulai dari short discovery sprint bersama.</p></div>
            <Link className="button button-light shrink-0" to="/contact">Book discovery call <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      <section id="why" className="bg-paper py-24 text-midnight md:py-32">
        <div className="page-shell">
          <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="section-label">/ COMMUNITY IS OUR OPERATING SYSTEM</p>
              <div className="mt-6 hidden h-px w-full bg-black/15 lg:block" />
            </div>
            <div>
              <h2 className="section-title max-w-4xl">Bukan audience. Komunitas kami ikut <span className="underline-sketch">membangun.</span></h2>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-ink-muted">Kami adalah pengguna AI dari berbagai profesi yang belajar, menguji, dan berbagi apa yang benar-benar bekerja. Energi itu yang membuat layanan kami tetap dekat dengan masalah nyata—sambil ngopi.</p>
            </div>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-3">
            {principles.map(({ index, title, copy, icon: Icon }) => (
              <article key={index} className="group bg-white p-7 transition-colors hover:bg-[#f8f7fa] md:p-9">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tracking-widest">{index}</span>
                  <span className="grid size-11 place-items-center rounded-lg border border-black/15 transition-colors group-hover:bg-yellow"><Icon size={20} /></span>
                </div>
                <h3 className="mt-16 text-2xl font-bold">{title}</h3>
                <p className="mt-4 leading-7 text-ink-muted">{copy}</p>
                <ArrowDownRight className="mt-8" size={22} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="chapters" className="bg-midnight py-24 text-white md:py-32">
        <div className="page-shell">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="section-label text-yellow">/ FIND YOUR PEOPLE</p>
              <h2 className="section-title mt-5 max-w-3xl">Local circles, growing city by city.</h2>
            </div>
            <p className="max-w-sm leading-7 text-white/55">Place-based circles for people who want to learn, ship, and share what works. Status stays descriptive until chapter-specific engagement is confirmed.</p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {publicChapters.map((chapter, index) => {
              const body = (
                <article className={`chapter-card${chapter.to ? ' group' : ''}`}>
                  <div className={`h-2 ${chapter.tone}`} />
                  <div className="p-7">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs uppercase tracking-[.18em] text-white/45">Chapter 0{index + 1}</span>
                      {chapter.to ? <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} /> : null}
                    </div>
                    <h3 className="mt-10 text-4xl font-bold">{chapter.name}</h3>
                    <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/55">
                      <span className="rounded-full border border-white/15 px-3 py-1.5">{chapter.scope}</span>
                      <span className="rounded-full border border-white/15 px-3 py-1.5">{chapter.detail}</span>
                    </div>
                    <div className="mt-7 border-t border-white/10 pt-5">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">Focus</p>
                      <p className="mt-2 flex items-center gap-2 text-sm"><MapPin size={15} className="shrink-0 text-yellow" />{chapter.focus}</p>
                    </div>
                  </div>
                </article>
              )

              return chapter.to ? (
                <Link key={chapter.name} to={chapter.to} className="block">{body}</Link>
              ) : (
                <div key={chapter.name}>{body}</div>
              )
            })}
          </div>
          <Link className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-yellow" to="/chapters">Explore chapters <ChevronRight size={16} /></Link>
        </div>
      </section>

      <section id="events" className="bg-white py-24 text-midnight md:py-32">
        <div className="page-shell">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <div className="rounded-[18px] border border-black/10 bg-[#eeeae0] p-4 sm:p-7">
                <div className="workspace-window overflow-hidden rounded-xl border border-black/15 bg-midnight text-white">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <span className="size-2.5 rounded-full bg-[#ff645e]" />
                    <span className="size-2.5 rounded-full bg-yellow" />
                    <span className="size-2.5 rounded-full bg-[#72d49c]" />
                    <span className="ml-3 font-mono text-[10px] text-white/35">vcfc-build-session</span>
                  </div>
                  <div className="grid min-h-[380px] sm:grid-cols-[130px_1fr]">
                    <div className="hidden border-r border-white/10 p-4 font-mono text-[10px] leading-7 text-white/35 sm:block">BRIEF.md<br />ideas/<br />prototype/<br /><span className="text-yellow">launch.tsx</span></div>
                    <div className="p-6 font-mono text-xs leading-7 sm:p-8">
                      <p className="text-white/35">// Saturday’s tiny experiment</p>
                      <p className="mt-4"><span className="text-[#ff8ca1]">const</span> idea = <span className="text-yellow">'useful, not perfect'</span></p>
                      <p><span className="text-[#ff8ca1]">const</span> team = community.<span className="text-[#b9a7ff]">findPeople</span>()</p>
                      <p><span className="text-[#ff8ca1]">const</span> result = <span className="text-[#b9a7ff]">await</span> build(idea, team)</p>
                      <p className="mt-5 text-white/70">✓ prototype shipped</p>
                      <p className="text-white/70">✓ new collaborators</p>
                      <span className="mt-7 inline-block h-4 w-2 animate-pulse bg-yellow" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 right-5 rotate-3 rounded-full bg-yellow px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest">No slides allowed</div>
            </div>

            <div>
              <p className="section-label">/ WHAT HAPPENS HERE</p>
              <h2 className="section-title mt-5">Less networking theatre. More making things.</h2>
              <p className="mt-6 text-lg leading-8 text-ink-muted">Come with a half-formed idea, a stubborn problem, or just curiosity. The room does the rest.</p>
              <ul className="mt-9 space-y-5">
                {['A hands-on build sprint', 'Friendly feedback from different disciplines', 'A demo, however beautifully unfinished', 'Coffee, context, and zero gatekeeping'].map((item) => (
                  <li key={item} className="flex items-center gap-4 border-b border-black/10 pb-5 font-medium"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-yellow"><Check size={15} strokeWidth={3} /></span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-paper py-24 text-midnight md:py-28">
        <div className="page-shell grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <MessageCircle className="text-yellow" size={36} fill="currentColor" />
            <p className="mt-7 max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">Come with a half-formed idea or a stubborn problem. Leave with something more real—and people to keep building with.</p>
          </div>
          <div className="lg:border-l lg:border-black/15 lg:pl-10">
            <p className="font-bold">How sessions feel</p>
            <p className="mt-1 text-sm text-ink-muted">Hands-on, multi-role, low gatekeeping—without fabricated testimonials.</p>
          </div>
        </div>
      </section>

      <section id="join" className="relative bg-white py-24 text-midnight md:py-32">
        <div className="squiggle absolute inset-x-0 top-0" />
        <div className="absolute inset-0 opacity-[.08] [background-image:radial-gradient(#150f23_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="page-shell relative z-10 text-center">
          <span className="inline-flex size-16 rotate-3 items-center justify-center rounded-2xl border-2 border-midnight bg-yellow text-midnight shadow-[5px_5px_0_#150f23]"><Coffee size={30} /></span>
          <h2 className="mx-auto mt-8 max-w-4xl text-5xl font-bold leading-[.98] tracking-[-.05em] sm:text-6xl md:text-7xl">Come to learn. Stay to build something real.</h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-black/65">Bergabung dengan komunitas atau ajak kami membangun solusi AI untuk bisnis Anda. Dua pintu, satu ekosistem.</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="button button-dark" to="/contact">Start an AI project <ArrowRight size={18} /></Link>
            <Link className="button button-outline-dark" to="/join">Join the community</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050505] py-16 text-white md:py-20">
        <div className="page-shell">
          <div className="grid gap-12 md:grid-cols-[1.2fr_.8fr_.9fr]">
            <div>
              <Link className="text-2xl font-bold text-yellow" to="/">Vibe Coding From Cafe</Link>
              <p className="mt-7 max-w-md text-lg leading-8 text-white/50">A support system for tech workers navigating the AI shift -- sambil ngopi bareng.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold">Navigate</h2>
              <nav className="mt-6 flex flex-col items-start gap-4 text-lg text-white/45" aria-label="Footer navigation">
                {footerNavigation.map((item) => (
                  'href' in item ? (
                    <a key={item.label} className="hover:text-yellow" href={item.href} target={item.external ? '_blank' : undefined} rel={item.external ? 'noreferrer' : undefined}>{item.label}</a>
                  ) : (
                    <Link key={item.label} className="hover:text-yellow" to={item.to}>{item.label}</Link>
                  )
                ))}
              </nav>
            </div>
            <div>
              <h2 className="text-xl font-bold">Connect</h2>
              <div className="mt-6 flex flex-col items-start gap-4 text-lg text-white/45">
                {footerConnect.map((item) => (
                  <a key={item.label} className="hover:text-yellow" href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-10 text-center text-lg text-white/40">
            Vibe Coding From Cafe -- Made with warmth from Indonesia.
          </div>
        </div>
      </footer>
    </main>
  )
}
