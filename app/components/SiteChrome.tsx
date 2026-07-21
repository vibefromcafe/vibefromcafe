import { useState } from 'react'
import { Coffee, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router'

const navigation = [
  { label: 'Chapters', to: '/chapters' },
  { label: 'Events', to: '/events' },
  { label: 'About', to: '/about' },
]

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

export function SiteBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand-mark" to="/" aria-label="Vibe From Cafe home">
      <span className="brand-icon"><Coffee size={compact ? 18 : 22} strokeWidth={2.6} /></span>
      <span className={compact ? 'hidden sm:inline' : ''}>Vibe From Cafe</span>
    </Link>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <nav className="page-shell flex h-20 items-center justify-between" aria-label="Main navigation">
        <SiteBrand />
        <div className="hidden items-center gap-8 text-sm text-white/65 md:flex">
          <a className="nav-link" href="https://cafein.id" target="_blank" rel="noreferrer">Cafes</a>
          {navigation.map((item) => (
            <NavLink key={item.to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} to={item.to}>{item.label}</NavLink>
          ))}
          <Link className="button button-small bg-yellow text-midnight" to="/join">Join</Link>
        </div>
        <button className="grid size-11 place-items-center rounded-lg border border-white/15 md:hidden" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {open ? (
        <div className="page-shell border-t border-white/10 py-6 md:hidden">
          <div className="flex flex-col gap-5 text-lg text-white/75">
            <a href="https://cafein.id" target="_blank" rel="noreferrer">Cafes</a>
            {navigation.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>{item.label}</NavLink>)}
            <Link className="text-yellow" to="/join" onClick={() => setOpen(false)}>Join community →</Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] py-16 text-white md:py-20">
      <div className="page-shell">
        <div className="grid gap-12 md:grid-cols-[1.2fr_.8fr_.9fr]">
          <div>
            <Link className="text-2xl font-bold text-yellow" to="/">Vibe From Cafe</Link>
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
          Vibe From Cafe -- Made with warmth from Indonesia.
        </div>
      </div>
    </footer>
  )
}

export function PageFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#08070b] text-white">
      <SiteHeader />
      <div className="page-shell py-16 md:py-24">
        <p className="section-label text-yellow">{eyebrow}</p>
        <h1 className="page-title mt-5 max-w-4xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/50">{intro}</p>
        <div className="mt-14">{children}</div>
      </div>
      <SiteFooter />
    </main>
  )
}
