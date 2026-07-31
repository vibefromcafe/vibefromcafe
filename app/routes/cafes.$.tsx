import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import type { MetaFunction } from "react-router";
import type { Cafe } from "../data/types";
import {
  CAFEIN_ORIGIN,
  getCafeMappingEntry,
  getCafeUrlMapping,
  resolveCafeSlug,
  type CafeMappingEntry,
} from "../data/cafe-url-migration";

export const meta: MetaFunction = ({ params }) => {
  const slug = params["*"] ?? "";
  const resolution = resolveCafeSlug(slug);

  if (resolution.kind === "not_found") {
    return [{ title: "Cafe Not Found — Vibe From Cafe" }];
  }

  if (resolution.kind === "legacy") {
    return [
      { title: `${resolution.cafe.name} (archived) — Vibe From Cafe` },
      {
        name: "description",
        content: `Archived Vibe From Cafe record for ${resolution.cafe.name}. Cafe discovery now lives on cafein.id.`,
      },
      { name: "robots", content: "noindex" },
    ];
  }

  return [
    { title: `Redirecting ${resolution.entry.legacyName} — Vibe From Cafe` },
    { name: "robots", content: "noindex" },
  ];
};

function Amenity({ label, active }: { label: string; active: boolean | null }) {
  if (active == null) return null;
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-yellow/40 bg-yellow/10 text-yellow"
          : "border-white/10 text-white/35 line-through"
      }`}
    >
      {label}
    </span>
  );
}

function PriceRow({ label, price }: { label: string; price: string | null }) {
  if (!price) return null;
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-3 text-sm">
      <span className="text-white/55">{label}</span>
      <span className="font-semibold text-white">{price}</span>
    </div>
  );
}

function CandidateList({ entry }: { entry: CafeMappingEntry }) {
  if (!entry.candidates?.length) return null;
  return (
    <section className="dark-card mt-8">
      <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">
        Possible cafein matches
      </p>
      <p className="mt-3 text-sm leading-6 text-white/55">
        Owner review required before any automatic redirect. These candidates were
        found on cafein.id but could not be verified from archived identity fields alone.
      </p>
      <ul className="mt-5 space-y-3">
        {entry.candidates.map((candidate) => (
          <li key={candidate.cafeinSlug}>
            <a
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3 text-left transition hover:border-yellow/40"
              href={candidate.destinationUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <span className="block font-semibold text-white">
                  {candidate.label}
                </span>
                <span className="mt-1 block font-mono text-[11px] text-white/40">
                  /cafe/{candidate.cafeinSlug}
                </span>
              </span>
              <span className="text-sm font-medium text-yellow">Open</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LegacyCafePage({
  cafe,
  entry,
}: {
  cafe: Cafe;
  entry: CafeMappingEntry;
}) {
  const mapping = getCafeUrlMapping();
  const hasPrices =
    cafe.espresso_price || cafe.cappuccino_price || cafe.americano_price;

  return (
    <main className="min-h-screen bg-midnight px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-yellow">
          / ARCHIVED CAFE
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{cafe.name}</h1>
        {cafe.map_location ? (
          <p className="mt-3 text-lg text-white/55">{cafe.map_location}</p>
        ) : null}

        <div className="mt-6 rounded-xl border border-yellow/25 bg-yellow/5 px-5 py-4 text-sm leading-6 text-white/80">
          <p className="font-semibold text-yellow">
            {entry.status === "ambiguous"
              ? "Mapping needs owner review"
              : entry.status === "intentionally_retired"
                ? "Intentionally kept as legacy-only"
                : "No verified cafein.id destination yet"}
          </p>
          <p className="mt-2 text-white/65">{entry.evidence}</p>
          {entry.ownerAction ? (
            <p className="mt-2 text-white/50">{entry.ownerAction}</p>
          ) : null}
        </div>

        {cafe.wifi_speed ? (
          <section className="dark-card mt-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Archived WiFi
            </p>
            <p className="mt-3 text-3xl font-bold text-yellow">
              {cafe.wifi_speed}{" "}
              <span className="text-base font-medium text-white/45">Mbps</span>
            </p>
          </section>
        ) : null}

        {hasPrices ? (
          <section className="dark-card mt-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Archived prices
            </p>
            <div className="mt-2">
              <PriceRow label="Espresso" price={cafe.espresso_price} />
              <PriceRow label="Cappuccino" price={cafe.cappuccino_price} />
              <PriceRow label="Americano" price={cafe.americano_price} />
            </div>
          </section>
        ) : null}

        <section className="dark-card mt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
            Archived amenities
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Amenity label="Musholla" active={cafe.has_prayer_room} />
            <Amenity label="AC" active={cafe.has_ac} />
            <Amenity label="Power outlets" active={cafe.has_power_outlets} />
            <Amenity label="Private room" active={cafe.has_private_room} />
            <Amenity label="Background music" active={cafe.background_music} />
            <Amenity label="Quiet vibes" active={cafe.quiet_vibes} />
            <Amenity label="Kids area" active={cafe.has_kids_area} />
          </div>
        </section>

        {cafe.notes ? (
          <section className="dark-card mt-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Notes
            </p>
            <p className="mt-3 leading-7 text-white/70">{cafe.notes}</p>
          </section>
        ) : null}

        <CandidateList entry={entry} />

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            className="button button-primary"
            href={CAFEIN_ORIGIN}
            target="_blank"
            rel="noreferrer"
          >
            Browse cafes on cafein.id
          </a>
          <Link className="button button-ghost" to="/">
            Back to Vibe From Cafe
          </Link>
        </div>

        <p className="mt-8 font-mono text-[11px] leading-5 text-white/35">
          Legacy path {entry.legacyPath}. Public mapping v{mapping.version} ·{" "}
          {mapping.counts.verified} verified / {mapping.counts.ambiguous} ambiguous /{" "}
          {mapping.counts.unmatched} unmatched. Machine-readable map:{" "}
          <a className="text-yellow/80 underline" href="/cafe-url-mapping.json">
            /cafe-url-mapping.json
          </a>
        </p>
      </div>
    </main>
  );
}

function RedirectNotice({
  name,
  destinationUrl,
}: {
  name: string;
  destinationUrl: string;
}) {
  useEffect(() => {
    window.location.replace(destinationUrl);
  }, [destinationUrl]);

  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-yellow">
          / REDIRECT
        </p>
        <h1 className="mt-4 text-3xl font-bold">Moving to cafein.id</h1>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          {name} now lives on cafein.id. You are being redirected to the matching
          cafe page.
        </p>
        <a className="button button-primary mt-8" href={destinationUrl}>
          Continue to cafein.id
        </a>
      </div>
    </main>
  );
}

function NotFoundPage({ slug }: { slug: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-yellow">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold">Cafe not found</h1>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          <span className="font-mono text-white/80">/cafes/{slug}</span> is not in
          the archived Vibe From Cafe directory.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a className="button button-primary" href={CAFEIN_ORIGIN}>
            Browse cafein.id
          </a>
          <Link className="button button-ghost" to="/">
            Home
          </Link>
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
    return (
      <RedirectNotice
        name={resolution.entry.legacyName}
        destinationUrl={resolution.destinationUrl}
      />
    );
  }

  if (resolution.kind === "legacy") {
    return <LegacyCafePage cafe={resolution.cafe} entry={resolution.entry} />;
  }

  // Client soft-nav unknown slug: show a real not-found page.
  // Edge function returns HTTP 404 for direct requests.
  return <NotFoundPage slug={slug || getCafeMappingEntry("")?.legacySlug || "unknown"} />;
}
