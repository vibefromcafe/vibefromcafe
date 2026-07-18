import { useEffect } from "react";
import { useLocation } from "react-router";
import {
  CAFEIN_ORIGIN,
  resolveCafesIndexDestination,
} from "../data/cafe-url-migration";

export default function CafesIndexRedirect() {
  const location = useLocation();
  const destination = resolveCafesIndexDestination(location.search);

  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-yellow">
          / CAFES
        </p>
        <h1 className="mt-4 text-3xl font-bold">Cafe browsing moved to cafein.id</h1>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          Vibe From Cafe discovery now lives on cafein.id. You are being redirected
          to the cafe directory.
        </p>
        <a
          className="mt-8 inline-flex rounded-lg bg-yellow px-5 py-3 font-bold text-midnight"
          href={destination}
        >
          Open cafein.id
        </a>
        <p className="mt-4 text-sm text-white/40">
          Destination: {CAFEIN_ORIGIN}
        </p>
      </div>
    </main>
  );
}
