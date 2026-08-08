import { useEffect } from "react";
import { NavLink } from "react-router";
import { PageFrame } from "./SiteChrome";

const adminMenu = [
  { label: "Submissions", to: "/admin", end: true },
  { label: "Inquiries", to: "/admin/inquiries" },
  { label: "Events", to: "/admin/events" },
];

export function AdminFrame({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  useEffect(() => {
    // Remove credentials persisted by the legacy admin UI without reading or
    // transmitting them. This migration cleanup can be removed after cutover.
    window.localStorage.removeItem("vcfc-admin-secret");
  }, []);

  return (
    <PageFrame eyebrow="/ ADMIN" title={title} intro={intro}>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="dark-card h-fit space-y-6">
          <nav className="space-y-2" aria-label="Admin menu">
            {adminMenu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `block rounded-lg px-4 py-3 text-sm font-bold ${isActive ? "bg-yellow text-midnight" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </PageFrame>
  );
}
