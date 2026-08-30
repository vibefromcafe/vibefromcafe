import { ArrowRight, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import { PageFrame } from "../components/SiteChrome";

export default function ChapterJogjaPage() {
  return (
    <PageFrame eyebrow="/ JOGJA CHAPTER" title="VFC Jogja." intro="An active local chapter for people learning, sharing, and building with AI in Yogyakarta.">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="dark-card"><MapPin className="text-yellow" /><p className="mt-8 text-2xl font-bold">Yogyakarta</p><p className="mt-2 text-white/45">The local home of VFC Jogja.</p></div>
        <div className="dark-card"><Users className="text-yellow" /><p className="mt-8 text-2xl font-bold">Active chapter</p><p className="mt-2 text-white/45">Connect through the community join flow.</p></div>
      </div>

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-yellow">Cafe discovery</p>
            <h2 className="mt-3 text-3xl font-bold">Find a place to work or meet.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/50">Cafe listings and current venue details live on cafein.id. VFC focuses on the people and chapter activities.</p>
          </div>
          <a className="button button-ghost" href="https://cafein.id" target="_blank" rel="noreferrer">Browse cafes on cafein.id <ArrowRight size={16} /></a>
        </div>
      </section>

      <div className="dark-card mt-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div><p className="text-xl font-bold">Want to connect with VFC Jogja?</p><p className="mt-2 text-white/50">Bring a project, question, or curiosity and select your city when joining.</p></div>
        <Link className="button button-primary" to="/join">Join the community <ArrowRight size={16} /></Link>
      </div>
    </PageFrame>
  );
}
