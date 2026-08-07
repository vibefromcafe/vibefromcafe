import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { LinksFunction, MetaFunction } from "react-router";
import "./app.css";

const SITE_TITLE = "Vibe From Cafe - AI Community";
const SITE_DESCRIPTION =
  "Vibe From Cafe is an AI community for learning, sharing, and career growth through discussions, sessions, hands-on building, webinars, and podcasts, with an adjacent studio that helps businesses build useful AI.";

export const meta: MetaFunction = () => [
  { title: SITE_TITLE },
  { name: "description", content: SITE_DESCRIPTION },
  { property: "og:title", content: SITE_TITLE },
  { property: "og:description", content: SITE_DESCRIPTION },
  { property: "og:image", content: "/og-image.png" },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/png", href: "/favicon.png" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
