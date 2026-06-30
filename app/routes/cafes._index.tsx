import { useEffect } from "react";

export default function CafesRedirect() {
  useEffect(() => {
    window.location.replace("https://cafein.id");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-midnight p-6 text-center text-white">
      <div>
        <h1 className="text-3xl font-bold">Cafe browsing moved to cafein.id</h1>
        <a className="mt-6 inline-flex rounded-lg bg-yellow px-5 py-3 font-bold text-midnight" href="https://cafein.id">Open cafein.id</a>
      </div>
    </main>
  );
}
