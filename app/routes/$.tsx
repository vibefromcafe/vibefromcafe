import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { PageFrame } from "../components/SiteChrome";

export default function NotFoundPage() {
  return (
    <PageFrame
      eyebrow="/ 404"
      title="This page is not at the table."
      intro="The address may be outdated or mistyped. Return home to find the community, chapters, and events."
    >
      <Link className="button bg-yellow text-midnight" to="/">
        <ArrowLeft size={16} /> Return home
      </Link>
    </PageFrame>
  );
}
