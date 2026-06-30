import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router";
import { PageFrame } from "../components/SiteChrome";

const chapterList = [
  { name: "Jogja", scope: "Yogyakarta", focus: "Main Jogja community group", memberCount: 258, accent: "#f5c400", to: "/chapters/jogja" },
  { name: "Surabaya-Malang", scope: "East Java", focus: "Surabaya and Malang builders", memberCount: 40, accent: "#79628c" },
  { name: "Jabodetabek", scope: "Greater Jakarta", focus: "Jakarta, Bogor, Depok, Tangerang, Bekasi", memberCount: 88, accent: "#7bb6ff" },
  { name: "Kuala Lumpur Isp.", scope: "Kuala Lumpur", focus: "Malaysia-based community circle", memberCount: 18, accent: "#f4a261" },
  { name: "Bandung", scope: "Bandung", focus: "Bandung builders and cafe sessions", memberCount: 9, accent: "#ff8ca1" },
];

export default function ChaptersPage() {
  return (
    <PageFrame eyebrow="/ FIND YOUR PEOPLE" title="A chapter, wherever you build." intro="Local chapters and groups for builders who want to learn, ship, and share what works.">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {chapterList.map((chapter, index) => {
          const content = (
            <article className="dark-card h-full overflow-hidden p-0 transition-transform hover:-translate-y-1">
              <div className="h-2" style={{ backgroundColor: chapter.accent }} />
              <div className="p-7">
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-white/35">Chapter {String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-8 text-4xl font-bold">{chapter.name}</h2>
                <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/55">
                  <span className="dark-pill">{chapter.scope}</span>
                  {chapter.memberCount ? <span className="dark-pill">{chapter.memberCount} members</span> : null}
                </div>
                <div className="mt-7 border-t border-white/10 pt-5"><p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Group focus</p><p className="mt-2 flex items-center gap-2 text-sm"><MapPin size={15} className="text-yellow" />{chapter.focus}</p></div>
              </div>
            </article>
          );

          return chapter.to ? <Link key={chapter.name} to={chapter.to}>{content}</Link> : <div key={chapter.name}>{content}</div>;
        })}
      </div>
      <div className="dark-card mt-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div><p className="text-xl font-bold">No chapter in your city yet?</p><p className="mt-2 text-white/50">Start small. We will help with the format, community kit, and first gathering.</p></div>
        <Link className="button bg-yellow text-midnight" to="/join">Start a chapter <ArrowRight size={16} /></Link>
      </div>
    </PageFrame>
  );
}
