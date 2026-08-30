import { getAllEvents } from "../../app/data/events-store";

interface Env {
  VFC_SUBMISSIONS: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const events = await getAllEvents(env);
    return Response.json({
      events: events.filter((event) => event.status === "published"),
    });
  } catch {
    return Response.json({ error: "Failed to load events" }, { status: 500 });
  }
};
