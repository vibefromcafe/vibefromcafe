import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { PageFrame } from "../components/SiteChrome";
import seedEvents from "../data/events.json";
import type { Event } from "../data/types";

interface EventsResponse {
  events?: Event[];
  error?: string;
}

function getEventStartsAt(event: { date: string; time: string }) {
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

function getEventAction(event: { mapUrl?: string }) {
  if (!event.mapUrl) return null;
  if (event.mapUrl.includes("maps.app.goo.gl")) return { label: "View map", href: event.mapUrl };
  return { label: "Event details", href: event.mapUrl };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV) {
        setEvents(seedEvents as Event[]);
        return;
      }

      const response = await fetch("/api/events");
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setEvents(seedEvents as Event[]);
        return;
      }

      const data = (await response.json()) as EventsResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load events");
      }
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const sortedEvents = events
    .filter((event) => event.status === "published")
    .map((event) => ({ ...event, expired: getEventStartsAt(event) < Date.now() }))
    .sort((first, second) => {
      if (first.expired !== second.expired) return first.expired ? 1 : -1;
      return first.expired ? getEventStartsAt(second) - getEventStartsAt(first) : getEventStartsAt(first) - getEventStartsAt(second);
    });

  return (
    <PageFrame eyebrow="/ EVENTS" title="Less networking theatre. More making things." intro="Hands-on sessions for people who want to understand AI by building with it.">
      {error ? <div className="mb-6 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      {loading ? (
        <div className="dark-card text-center text-white/50">Loading events...</div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event) => {
            const action = getEventAction(event);
            return (
              <article key={event.id} className={`dark-card grid gap-6 transition-opacity md:grid-cols-[100px_1fr_auto] md:items-center ${event.expired ? "opacity-45" : ""}`}>
                <div className={`grid size-20 place-items-center rounded-xl text-center font-mono text-sm font-bold leading-5 ${event.expired ? "bg-white/10 text-white/60" : "bg-yellow text-midnight"}`}>{formatEventDate(event.date)}</div>
                <div>
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${event.expired ? "text-white/40" : "text-yellow"}`}>{getEventCity(event)}</p>
                  <h2 className="mt-2 text-2xl font-bold">{event.title}</h2>
                  <p className="mt-3 max-w-2xl leading-7 text-white/50">{event.description}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-xs text-white/45"><span className="flex items-center gap-2"><Clock3 size={14} />{event.time} WIB</span><span className="flex items-center gap-2"><MapPin size={14} />{event.location}</span></div>
                </div>
                {event.expired ? (
                  <span className="button cursor-not-allowed border border-white/10 text-white/35">Event ended</span>
                ) : action ? (
                  <a className="button button-ghost" href={action.href} target="_blank" rel="noreferrer">{action.label} <ArrowRight size={16} /></a>
                ) : (
                  <span className="button cursor-not-allowed border border-white/10 text-white/35">Details soon</span>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[["Build sessions", "Two focused hours to turn a useful idea into a tiny working prototype."], ["Prompt clinics", "Bring a prompt or workflow that keeps failing and debug it together."], ["Open demos", "Share unfinished work, practical lessons, and shortcuts worth passing on."]].map(([title, copy]) => <article key={title} className="dark-card"><CalendarDays className="text-yellow" /><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 leading-7 text-white/50">{copy}</p></article>)}
      </div>
    </PageFrame>
  );
}
