import { Check } from "lucide-react";
import { PageFrame } from "../components/SiteChrome";

export default function AboutPage() {
  return (
    <PageFrame eyebrow="/ ABOUT VFC" title="Built around a table, not a stage." intro="Vibe From Cafe is an AI community and studio where people learn, share, build, and grow together.">
      <div className="space-y-5">
        <article className="dark-card"><h2 className="text-2xl font-bold text-yellow">Our story</h2><div className="mt-6 space-y-5 text-lg leading-8 text-white/55"><p>Vibe From Cafe bermula dari kebiasaan sederhana: berbagi rekomendasi cafe produktif supaya kerja makin fokus.</p><p>Dari ngobrol bareng di meja cafe, topiknya makin sering ke AI. Banyak pekerja tech antusias, tetapi juga bingung harus mulai dari mana di tengah perubahan yang cepat.</p><p>Dari situ VFC berkembang menjadi sistem pendukung untuk belajar, bereksperimen, dan tumbuh bersama. Cafe tetap menjadi rumah untuk bertemu, ngobrol, dan mengeksekusi ide.</p></div></article>
        <article className="dark-card"><h2 className="text-2xl font-bold text-yellow">Community focus</h2><ul className="mt-7 space-y-5">{[['AI adoption & hands-on learning', 'Praktik langsung, bukan teori saja.'], ["Builder's disposition", 'Side projects, experimentation, and love of making things.'], ['Career growth in the AI era', 'Membangun skill, portfolio, dan confidence.'], ['Organic talent networking', 'Koneksi yang tumbuh lewat kolaborasi dan trust.']].map(([title, copy]) => <li key={title} className="flex gap-4 text-white/55"><Check className="mt-1 shrink-0 text-yellow" size={18} strokeWidth={3} /><span><strong className="text-white/80">{title}</strong> - {copy}</span></li>)}</ul></article>
        <article className="dark-card"><h2 className="text-2xl font-bold text-yellow">How we work</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{[['Learn in public', 'Make what you learn legible to someone else.'], ['Build small', 'Ship a useful prototype before polishing the story.'], ['Share the shortcut', 'Pass around prompts, workflows, and honest mistakes.']].map(([title, copy], index) => <div key={title} className="rounded-xl border border-white/10 p-5"><span className="font-mono text-xs text-yellow">/0{index + 1}</span><h3 className="mt-6 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/45">{copy}</p></div>)}</div></article>
      </div>
    </PageFrame>
  );
}
