import { useState, type FormEvent } from "react";
import { ArrowRight, BrainCircuit, Check, Workflow } from "lucide-react";
import { PageFrame } from "../components/SiteChrome";

type InquiryForm = {
  name: string;
  contact: string;
  message: string;
};

const initialForm: InquiryForm = {
  name: "",
  contact: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof InquiryForm>(key: K, value: InquiryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFrame eyebrow="/ CONTACT" title="Tell us the AI project you want to make real." intro="A lightweight intake for businesses that want VCFC to design and build useful AI assistants, automation, or custom products.">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="dark-card">
          {submitted ? (
            <div className="space-y-5 text-center">
              <h2 className="text-3xl font-bold text-yellow">Inquiry received.</h2>
              <p className="mx-auto max-w-xl leading-7 text-white/55">Thanks. We stored your project inquiry and will follow up through the contact you shared.</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <label className="form-field">Name<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" /></label>
              <label className="form-field">Contact<input required value={form.contact} onChange={(event) => updateField("contact", event.target.value)} placeholder="Email or WhatsApp number" /></label>
              <label className="form-field">Message<textarea required rows={6} value={form.message} onChange={(event) => updateField("message", event.target.value)} placeholder="What problem should this AI project solve?" /></label>
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button className="button bg-yellow text-midnight" type="submit" disabled={loading}>{loading ? "Sending..." : "Send inquiry"} <ArrowRight size={16} /></button>
            </form>
          )}
        </div>
        <aside className="space-y-4">
          <div className="dark-card"><BrainCircuit className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">Discovery first</h2><p className="mt-3 leading-7 text-white/50">We start from the business problem, not the AI trend.</p></div>
          <div className="dark-card"><Workflow className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">Built for real workflows</h2><ul className="mt-5 space-y-3 text-white/50">{["Workflow fit", "Human handoff", "Measurable operations"].map((item) => <li key={item} className="flex items-center gap-3"><Check size={16} className="text-yellow" />{item}</li>)}</ul></div>
        </aside>
      </div>
    </PageFrame>
  );
}
