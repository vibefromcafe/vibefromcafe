import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { PageFrame } from "../components/SiteChrome";
import { TurnstileWidget, hasTurnstileSiteKey } from "../components/TurnstileWidget";

type InterestForm = {
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: string;
  referralName: string;
  privacyConsent: boolean;
};

type WhatsappInviteConfig = {
  groupInviteUrl: string;
  messageTemplate: string;
};

type JoinResponse = {
  error?: string;
  success?: boolean;
  whatsappInvite?: Partial<WhatsappInviteConfig>;
};

const initialForm: InterestForm = {
  name: "",
  city: "",
  role: "",
  whatsapp: "",
  referralSource: "",
  referralName: "",
  privacyConsent: false,
};

const sources = [
  { value: "friend", label: "A friend" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "github", label: "GitHub" },
  { value: "other", label: "Other" },
];

export default function JoinPage() {
  const [form, setForm] = useState<InterestForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappInvite, setWhatsappInvite] = useState<WhatsappInviteConfig | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof InterestForm>(key: K, value: InterestForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasTurnstileSiteKey() && !turnstileToken) {
      setError("Please complete the verification before submitting.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });
      const data = (await response.json()) as JoinResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      setWhatsappInvite({
        groupInviteUrl: data.whatsappInvite?.groupInviteUrl?.trim() ?? "",
        messageTemplate: data.whatsappInvite?.messageTemplate?.trim() ?? "",
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFrame eyebrow="/ JOIN THE COMMUNITY" title="Come to learn. Stay to build something real." intro="Kamu tidak sendirian menghadapi AI shift. Gabung dengan builders lintas profesi dan kota yang belajar bareng.">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div className="dark-card">
          {submitted ? (
            <div className="space-y-5 text-center">
              {whatsappInvite?.groupInviteUrl ? (
                <>
                  <h2 className="text-3xl font-bold text-yellow">You're invited!</h2>
                  <p className="mx-auto max-w-xl leading-7 text-white/55">We received your details. Join the WhatsApp group now to continue onboarding with the VCFC community.</p>
                  <a className="button bg-yellow text-midnight" href={whatsappInvite.groupInviteUrl} target="_blank" rel="noreferrer">Join WhatsApp group <ArrowRight size={16} /></a>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-yellow">Thanks, your submission is in.</h2>
                  <p className="leading-7 text-white/55">We received your details. Tim VCFC bakal share the WhatsApp invite soon.</p>
                </>
              )}
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <label className="form-field">Name<input required name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" /></label>
              <label className="form-field">City<input required name="city" value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Where are you based?" /></label>
              <label className="form-field">What do you do?<textarea required name="role" rows={4} value={form.role} onChange={(event) => updateField("role", event.target.value)} placeholder="Builder, designer, marketer, student, etc." /></label>
              <label className="form-field">WhatsApp number<input required name="whatsapp" type="tel" value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="+62 812 3456 7890" /></label>
              <label className="form-field">How did you hear about us?<select required name="referralSource" value={form.referralSource} onChange={(event) => { updateField("referralSource", event.target.value); updateField("referralName", ""); }}><option value="">Select an option...</option>{sources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              {form.referralSource === "friend" ? <label className="form-field">Who referred you?<input name="referralName" value={form.referralName} onChange={(event) => updateField("referralName", event.target.value)} placeholder="Their name or WhatsApp handle" /></label> : null}
              {form.referralSource === "other" ? <label className="form-field">How did you find us?<input name="referralName" value={form.referralName} onChange={(event) => updateField("referralName", event.target.value)} placeholder="e.g. Google search, blog post, event" /></label> : null}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/55">
                We use your submitted details only to process VCFC community onboarding. Admins can review your submission. To request correction or deletion, contact @vibefromcafe.
              </div>
              <label className="flex items-start gap-3 text-sm leading-6 text-white/65">
                <input
                  required
                  className="mt-1 size-4"
                  type="checkbox"
                  checked={form.privacyConsent}
                  onChange={(event) => updateField("privacyConsent", event.target.checked)}
                />
                <span>I agree that VCFC may use my WhatsApp number and submitted details to process community onboarding.</span>
              </label>
              <TurnstileWidget onToken={setTurnstileToken} />
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button className="button bg-yellow text-midnight" type="submit" disabled={loading}>{loading ? "Submitting..." : "Express interest"} <ArrowRight size={16} /></button>
            </form>
          )}
        </div>
        <aside className="space-y-4">
          <div className="dark-card"><Users className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">400+ members</h2><p className="mt-3 leading-7 text-white/50">Designers, engineers, founders, marketers, researchers, and the curious.</p></div>
          <div className="dark-card"><Sparkles className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">No gatekeeping</h2><p className="mt-3 leading-7 text-white/50">Datang dengan rasa ingin tahu. Tinggalkan ruangan dengan sesuatu yang lebih nyata.</p></div>
        </aside>
      </div>
    </PageFrame>
  );
}
