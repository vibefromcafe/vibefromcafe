import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router";
import { PageFrame } from "../components/SiteChrome";
import { publicChapters } from "../data/public-claims";

export default function ChaptersPage() {
  return (
    <PageFrame eyebrow="/ FIND YOUR PEOPLE" title="Five active chapters. Find yours." intro="Connect with people learning and building with AI in your area. Each chapter card takes you to the best public action currently available.">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {publicChapters.map((chapter, index) => (
          <Link key={chapter.id} to={chapter.action.to} className="chapter-link" aria-label={`${chapter.action.label}: ${chapter.name}`}>
            <article className="dark-card h-full overflow-hidden p-0">
              <div className="h-2" style={{ backgroundColor: chapter.accent }} />
              <div className="p-7">
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-white/35">Chapter {String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-8 text-4xl font-bold">{chapter.name}</h2>
                <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="dark-pill">{chapter.scope}</span>
                  <span className="dark-pill">Active chapter</span>
                </div>
                <div className="mt-7 border-t border-white/10 pt-5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Next step</p>
                  <p className="mt-2 flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><MapPin size={15} className="text-yellow" />{chapter.action.label}</span><ArrowRight size={16} /></p>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
      <div className="dark-card mt-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div><p className="text-xl font-bold">No chapter in your city yet?</p><p className="mt-2 text-white/50">Join the community and tell us where you are interested in connecting.</p></div>
        <Link className="button button-primary" to="/join">Express interest <ArrowRight size={16} /></Link>
      </div>
    </PageFrame>
  );
}
