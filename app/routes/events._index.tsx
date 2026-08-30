import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, Link as LinkIcon, MapPin } from "lucide-react";
import { PageFrame } from "../components/SiteChrome";
import type { Event } from "../data/types";

interface EventsResponse {
  events?: Event[];
  error?: string;
}

export function getEventStartsAt(event: { date: string; time: string }) {
  return new Date(`${event.date}T${event.time}:00+07:00`).getTime();
}

function formatEventDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day} ${new Date(`${year}-${month}-01T00:00:00+07:00`).toLocaleString("en-US", { month: "short" }).toUpperCase()}`;
}

function getEventCity(event: { id: string; location: string }) {
  if (event.id.includes("jakarta")) return "Jakarta";
  if (event.id.includes("jogja") || event.location.toLowerCase().includes("yogyakarta")) return "Yogyakarta";
  if (event.id.includes("bantul") || event.location.toLowerCase().includes("bantul")) return "Bantul";
  return event.location.split(",").at(-1)?.trim() ?? "VFC";
}

export function splitPublishedEvents(events: Event[], now = Date.now()) {
  const published = events.filter((event) => event.status === "published");
  return {
    upcoming: published
      .filter((event) => getEventStartsAt(event) >= now)
      .sort((first, second) => getEventStartsAt(first) - getEventStartsAt(second)),
    past: published
      .filter((event) => getEventStartsAt(event) < now)
      .sort((first, second) => getEventStartsAt(second) - getEventStartsAt(first)),
  };
}

function EventCard({ event, past }: { event: Event; past: boolean }) {
  return (
    <article id={event.id} className={`dark-card scroll-mt-6 transition-opacity ${past ? "opacity-60" : ""}`}>
      <div className="grid gap-6 md:grid-cols-[100px_1fr] md:items-start">
        <div className={`grid size-20 place-items-center rounded-xl text-center font-mono text-sm font-bold leading-5 ${past ? "bg-white/10 text-white/60" : "bg-yellow text-midnight"}`}>{formatEventDate(event.date)}</div>
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-widest ${past ? "text-white/40" : "text-yellow"}`}>{getEventCity(event)}</p>
          <h3 className="mt-2 text-2xl font-bold">{event.title}</h3>
          <p className="mt-3 max-w-2xl leading-7 text-white/50">{event.description}</p>
          <div className="mt-4 flex flex-wrap gap-5 text-xs text-white/45">
            <span className="flex items-center gap-2"><Clock3 size={14} />{event.time} WIB</span>
            <span className="flex items-center gap-2"><MapPin size={14} />{event.location}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {!past && event.registrationUrl ? <a className="button bg-yellow text-midnight" href={event.registrationUrl} target="_blank" rel="noreferrer">Register <ArrowRight size={16} /></a> : null}
            {event.detailsUrl ? <a className="button button-ghost" href={event.detailsUrl} target="_blank" rel="noreferrer">Event details <ArrowRight size={16} /></a> : null}
            {event.mapUrl ? <a className="button button-ghost" href={event.mapUrl} target="_blank" rel="noreferrer">View map <MapPin size={16} /></a> : null}
            <a className="button button-ghost" href={`#${encodeURIComponent(event.id)}`} aria-label={`Permalink to ${event.title}`}>Permalink <LinkIcon size={16} /></a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events");
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Events are temporarily unavailable");
      }

      const data = (await response.json()) as EventsResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load events");
      }
      if (!Array.isArray(data.events)) {
        throw new Error("Events are temporarily unavailable");
      }
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const { upcoming, past } = splitPublishedEvents(events);

  return (
    <PageFrame eyebrow="/ EVENTS" title="Less networking theatre. More making things." intro="Hands-on sessions for people who want to understand AI by building with it.">
      {loading ? <div className="dark-card text-center text-white/50" role="status">Loading events...</div> : null}
      {!loading && error ? (
        <div className="dark-card text-center" role="alert">
          <h2 className="text-xl font-bold">Events could not be loaded.</h2>
          <p className="mt-2 text-white/50">{error}</p>
          <button className="button button-ghost mt-5" type="button" onClick={() => void loadEvents()}>Retry</button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="space-y-10">
          <section aria-labelledby="upcoming-events-heading">
            <h2 id="upcoming-events-heading" className="mb-4 text-2xl font-bold">Upcoming events</h2>
            {upcoming.length > 0 ? <div className="space-y-4">{upcoming.map((event) => <EventCard key={event.id} event={event} past={false} />)}</div> : (
              <div className="dark-card text-center">
                <h3 className="text-xl font-bold">No upcoming events are scheduled.</h3>
                <p className="mt-2 text-white/50">Check back here for the next Vibe From Cafe session.</p>
                <button className="button button-ghost mt-5" type="button" onClick={() => void loadEvents()}>Refresh events</button>
              </div>
            )}
          </section>
          {past.length > 0 ? (
            <section aria-labelledby="past-events-heading">
              <h2 id="past-events-heading" className="mb-4 text-2xl font-bold">Past events</h2>
              <p className="mb-4 text-sm text-white/45">Previous published events remain here as an archive.</p>
              <div className="space-y-4">{past.map((event) => <EventCard key={event.id} event={event} past />)}</div>
            </section>
          ) : null}
        </div>
      ) : null}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[["Build sessions", "Two focused hours to turn a useful idea into a tiny working prototype."], ["Prompt clinics", "Bring a prompt or workflow that keeps failing and debug it together."], ["Open demos", "Share unfinished work, practical lessons, and shortcuts worth passing on."]].map(([title, copy]) => <article key={title} className="dark-card"><CalendarDays className="text-yellow" /><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-white/50">{copy}</p></article>)}
      </div>
    </PageFrame>
  );
}
