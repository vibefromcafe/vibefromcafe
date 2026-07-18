import { ArrowRight, Coffee, MapPin, Wifi } from "lucide-react";
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
    <PageFrame
      eyebrow="/ JOGJA CHAPTER"
      title="VFC Jogja."
      intro="A local chapter page with cafe-context notes from Yogyakarta. Community join is site-wide until a chapter-specific path is confirmed."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="dark-card">
          <Coffee className="text-yellow" />
          <p className="mt-8 text-4xl font-bold">{jogjaCafes.length}</p>
          <p className="mt-2 text-white/45">Local cafe notes kept for Jogja chapter context (archive count only).</p>
        </div>
        <div className="dark-card">
          <MapPin className="text-yellow" />
          <p className="mt-8 text-4xl font-bold">Page</p>
          <p className="mt-2 text-white/45">
            Public chapter page. Not labeled open/active—chapter-specific engagement is still owner-unconfirmed.
          </p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">Local cafe notes</p>
            <h2 className="mt-3 text-3xl font-bold">Sample Jogja cafe context</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
              Names and amenities from archived local notes. Per-cafe Wi‑Fi speed figures are not shown publicly
              (unsupported without owner-attested measurement context). Browse live cafe data on cafein.id.
            </p>
          </div>
          <a className="button button-ghost" href="https://cafein.id" target="_blank" rel="noreferrer">
            Browse cafes on cafein.id <ArrowRight size={16} />
          </a>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topCafes.map((cafe) => (
            <article key={cafe.slug} className="dark-card">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                {cafe.map_location ?? "Jogja"}
              </p>
              <h3 className="mt-5 text-2xl font-bold">{cafe.name}</h3>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/55">
                {cafe.has_ac ? <span className="dark-pill">AC</span> : null}
                {cafe.has_power_outlets ? <span className="dark-pill">Power</span> : null}
                {!cafe.has_ac && !cafe.has_power_outlets ? (
                  <span className="dark-pill inline-flex items-center gap-1.5">
                    <Wifi size={12} /> Local note
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="dark-card mt-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="text-xl font-bold">Want to connect around Jogja?</p>
          <p className="mt-2 text-white/50">
            Use the site-wide community join for now. Chapter-specific routing is an open owner decision (#8 / claims
            register).
          </p>
        </div>
        <Link className="button button-primary" to="/join">
          Join the community <ArrowRight size={16} />
        </Link>
      </div>
    </PageFrame>
  );
}
