import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { PageFrame } from "./SiteChrome";

const adminMenu = [
  { label: "Submissions", to: "/admin", end: true },
  { label: "Inquiries", to: "/admin/inquiries" },
  { label: "Events", to: "/admin/events" },
  { label: "Health", to: "/admin/health" },
];

export function getAdminSecret() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem("vcfc-admin-secret") ?? "";
}

export function adminHeaders(): Record<string, string> {
  const secret = getAdminSecret();
  return secret ? { "X-Admin-Secret": secret } : {};
}

export function AdminFrame({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const [secret, setSecret] = useState("");

  useEffect(() => {
    setSecret(getAdminSecret());
  }, []);

  function saveSecret(value: string) {
    setSecret(value);
    window.localStorage.setItem("vcfc-admin-secret", value);
  }

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
          <label className="form-field text-xs">
            Admin secret
            <input
              type="password"
              value={secret}
              onChange={(event) => saveSecret(event.target.value)}
              placeholder="Optional in Access-protected prod"
            />
          </label>
        </aside>
        <section>{children}</section>
      </div>
    </PageFrame>
  );
}
