import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import type { MetaFunction } from "react-router";
import type { Cafe } from "../data/types";
import {
  CAFEIN_ORIGIN,
  resolveCafeSlug,
  type CafeMappingEntry,
} from "../data/cafe-url-migration";

export const meta: MetaFunction = ({ params }) => {
  const resolution = resolveCafeSlug(params["*"] ?? "");
  if (resolution.kind === "legacy") {
    return [
      { title: `${resolution.cafe.name} (archived) — Vibe From Cafe` },
      { name: "robots", content: "noindex" },
    ];
  }
  if (resolution.kind === "not_found") {
    return [{ title: "Cafe Not Found — Vibe From Cafe" }];
  }
  return [{ title: "Redirecting to cafein.id — Vibe From Cafe" }];
};

function ArchivedDetails({ cafe }: { cafe: Cafe }) {
  const prices = [
    ["Espresso", cafe.espresso_price],
    ["Cappuccino", cafe.cappuccino_price],
    ["Americano", cafe.americano_price],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const amenities = [
    ["WiFi", cafe.wifi_speed ? `${cafe.wifi_speed} Mbps` : null],
    ["AC", cafe.has_ac],
    ["Power outlets", cafe.has_power_outlets],
    ["Prayer room", cafe.has_prayer_room],
    ["Private room", cafe.has_private_room],
    ["Quiet", cafe.quiet_vibes],
    ["Kids area", cafe.has_kids_area],
  ].filter((item) => item[1] !== null);

  return (
    <>
      {amenities.length ? (
        <section className="dark-card mt-6">
          <h2 className="text-xl font-bold">Archived workspace details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {amenities.map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4 border-b border-white/10 py-2">
                <dt className="text-white/50">{label}</dt>
                <dd>{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {prices.length ? (
        <section className="dark-card mt-6">
          <h2 className="text-xl font-bold">Archived prices</h2>
          <dl className="mt-4">
            {prices.map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-white/10 py-2">
                <dt className="text-white/50">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {cafe.notes ? (
        <section className="dark-card mt-6">
          <h2 className="text-xl font-bold">Archived notes</h2>
          <p className="mt-3 leading-7 text-white/65">{cafe.notes}</p>
        </section>
      ) : null}
    </>
  );
}

function LegacyCafePage({ cafe, entry }: { cafe: Cafe; entry: CafeMappingEntry }) {
  return (
    <main className="min-h-screen bg-midnight px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-yellow">
          / Archived cafe
        </p>
        <h1 className="mt-4 text-4xl font-bold">{cafe.name}</h1>
        {cafe.map_location ? <p className="mt-3 text-white/55">{cafe.map_location}</p> : null}

        <section className="mt-8 rounded-xl border border-yellow/25 bg-yellow/5 p-5">
          <h2 className="font-bold text-yellow">
            {entry.status === "ambiguous"
              ? "Destination needs owner review"
              : "No verified cafein.id destination"}
          </h2>
          <p className="mt-2 leading-6 text-white/65">{entry.evidence}</p>
          {entry.ownerAction ? <p className="mt-2 text-sm text-white/45">{entry.ownerAction}</p> : null}
        </section>

        {entry.candidates?.length ? (
          <section className="dark-card mt-6">
            <h2 className="text-xl font-bold">Possible matches</h2>
            <p className="mt-2 text-sm text-white/50">Listed for review only; this page does not redirect to them.</p>
            <ul className="mt-4 space-y-2">
              {entry.candidates.map((candidate, index) => (
                <li key={`${candidate.cafeinSlug}-${index}`} className="rounded-lg border border-white/10 px-4 py-3">
                  {candidate.label} <span className="font-mono text-xs text-white/35">({candidate.cafeinSlug})</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ArchivedDetails cafe={cafe} />

        <div className="mt-10 flex flex-wrap gap-3">
          <a className="button button-primary" href={CAFEIN_ORIGIN}>Browse cafein.id</a>
          <Link className="button button-ghost" to="/">Back to Vibe From Cafe</Link>
        </div>
        <p className="mt-8 text-xs text-white/35">
          This read-only record is deprecated and may be stale. See the{" "}
          <a className="underline" href="/cafe-url-mapping.json">public migration map</a>.
        </p>
      </div>
    </main>
  );
}

function RedirectNotice({ entry, destinationUrl }: { entry: CafeMappingEntry; destinationUrl: string }) {
  useEffect(() => {
    window.location.replace(destinationUrl);
  }, [destinationUrl]);

  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <h1 className="text-3xl font-bold">Moving to cafein.id</h1>
        <p className="mt-4 text-white/60">The archived cafe <strong>{entry.legacySlug}</strong> has a verified cafein.id destination.</p>
        <a className="button button-primary mt-8" href={destinationUrl}>Continue to cafein.id</a>
      </div>
    </main>
  );
}

function NotFoundPage({ slug }: { slug: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <p className="font-mono text-yellow">404</p>
        <h1 className="mt-4 text-3xl font-bold">Cafe not found</h1>
        <p className="mt-4 text-white/60">/cafes/{slug} is not in the archived Vibe From Cafe directory.</p>
        <div className="mt-8 flex justify-center gap-3">
          <a className="button button-primary" href={CAFEIN_ORIGIN}>Browse cafein.id</a>
          <Link className="button button-ghost" to="/">Home</Link>
        </div>
      </div>
    </main>
  );
}

export default function CafeSlugRoute() {
  const params = useParams();
  const location = useLocation();
  const slug = params["*"] ?? "";
  const resolution = resolveCafeSlug(slug, location.search);

  if (resolution.kind === "redirect") {
    return <RedirectNotice entry={resolution.entry} destinationUrl={resolution.destinationUrl} />;
  }
  if (resolution.kind === "legacy") {
    return <LegacyCafePage cafe={resolution.cafe} entry={resolution.entry} />;
  }
  return <NotFoundPage slug={slug || "unknown"} />;
}
