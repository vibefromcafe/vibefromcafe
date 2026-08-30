import { useEffect } from "react";
import { useLocation } from "react-router";
import { resolveCafesIndexDestination } from "../data/cafe-url-migration";

export default function CafesIndexRedirect() {
  const location = useLocation();
  const destination = resolveCafesIndexDestination(location.search);

  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <h1 className="text-3xl font-bold">Cafe browsing moved to cafein.id</h1>
        <p className="mx-auto mt-4 max-w-lg text-white/60">
          Vibe From Cafe keeps cafe discovery external. You are being redirected
          to the cafein.id directory.
        </p>
        <a className="button button-primary mt-8" href={destination}>
          Open cafein.id
        </a>
      </div>
    </main>
  );
}
