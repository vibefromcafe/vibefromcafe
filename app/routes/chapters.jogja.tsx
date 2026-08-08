import { ArrowRight, Coffee, Wifi, Zap } from "lucide-react";
import { Link } from "react-router";
import { PageFrame } from "../components/SiteChrome";
import cafes from "../data/cafes.json";
import type { Cafe } from "../data/types";

function parseWifi(cafe: Cafe) {
  return Number.parseFloat((cafe.wifi_speed ?? "0").split(":")[0]) || 0;
}

export default function ChapterJogjaPage() {
  const jogjaCafes = (cafes as Cafe[]).filter((cafe) => cafe.chapter === "jogja");
  const topCafes = [...jogjaCafes]
    .filter((cafe) => cafe.wifi_speed)
    .sort((first, second) => parseWifi(second) - parseWifi(first))
    .slice(0, 6);

  return (
    <PageFrame eyebrow="/ JOGJA CHAPTER" title="VFC Jogja." intro="The first active chapter: builders learning AI together from real cafe workspaces in Yogyakarta.">
      <div className="grid gap-5 md:grid-cols-3">
        <div className="dark-card"><Coffee className="text-yellow" /><p className="mt-8 text-4xl font-bold">{jogjaCafes.length}</p><p className="mt-2 text-white/45">Deprecated cafe data points retained for chapter context.</p></div>
        <div className="dark-card"><Wifi className="text-yellow" /><p className="mt-8 text-4xl font-bold">{topCafes[0]?.wifi_speed ?? "N/A"}</p><p className="mt-2 text-white/45">Top recorded WiFi speed from the archived cafe dataset.</p></div>
        <div className="dark-card"><Zap className="text-yellow" /><p className="mt-8 text-4xl font-bold">Active</p><p className="mt-2 text-white/45">Hands-on chapter for AI learning and build sessions.</p></div>
      </div>

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">Deprecated cafe data</p>
            <h2 className="mt-3 text-3xl font-bold">Top Jogja cafe context</h2>
          </div>
          <a className="button button-ghost" href="https://cafein.id" target="_blank" rel="noreferrer">Browse cafes on cafein.id <ArrowRight size={16} /></a>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topCafes.map((cafe) => (
            <article key={cafe.slug} className="dark-card">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">{cafe.map_location ?? "Jogja"}</p>
              <h3 className="mt-5 text-2xl font-bold">{cafe.name}</h3>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/55">
                {cafe.wifi_speed ? <span className="dark-pill">{cafe.wifi_speed} Mbps</span> : null}
                {cafe.has_ac ? <span className="dark-pill">AC</span> : null}
                {cafe.has_power_outlets ? <span className="dark-pill">Power</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="dark-card mt-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div><p className="text-xl font-bold">Ready to join the Jogja support circle?</p><p className="mt-2 text-white/50">Bring a project, question, or curiosity. The table handles the rest.</p></div>
        <Link className="button bg-yellow text-midnight" to="/join">Join the community <ArrowRight size={16} /></Link>
      </div>
    </PageFrame>
  );
}
