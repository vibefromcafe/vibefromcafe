import { useCallback, useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { usePublicFormConfig } from "../components/PublicFormConfig";
import { PageFrame } from "../components/SiteChrome";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { publicMemberCount } from "../data/public-claims";
import { REFERRAL_SOURCES, type ReferralSource } from "../data/public-forms";

type InterestForm = {
  name: string;
  city: string;
  role: string;
  whatsapp: string;
  referralSource: ReferralSource | "";
  referralName: string;
  privacyConsent: boolean;
};

type JoinResponse = {
  error?: string;
  success?: boolean;
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

export default function JoinPage() {
  const [form, setForm] = useState<InterestForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicForm = usePublicFormConfig();

  function updateField<K extends keyof InterestForm>(key: K, value: InterestForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  const handleTurnstileError = useCallback(() => {
    setError("Verification is temporarily unavailable. Please try again.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publicForm.config) {
      setError(publicForm.error ?? "Please wait while form protection loads.");
      return;
    }
    if (publicForm.config.turnstileSiteKey && !turnstileToken) {
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
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
      setTurnstileToken("");
      setTurnstileAttempt((attempt) => attempt + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFrame eyebrow="/ JOIN THE COMMUNITY" title="Come to learn. Stay to build something real." intro="Join discussions, sessions, hands-on builds, webinars, podcasts, and career support with people across professions and cities.">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div className="dark-card">
          {submitted ? (
            <div className="space-y-5 text-center">
              <h2 className="text-3xl font-bold text-yellow">Thanks, your submission is in.</h2>
              <p className="leading-7 text-white/55">We received your details. Tim VFC bakal share the WhatsApp invite soon.</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <label className="form-field">Name<input required maxLength={100} name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" /></label>
              <label className="form-field">City<input required maxLength={80} name="city" value={form.city} onChange={(event) => updateField("city", event.target.value)} placeholder="Where are you based?" /></label>
              <label className="form-field">What do you do?<textarea required maxLength={280} name="role" rows={4} value={form.role} onChange={(event) => updateField("role", event.target.value)} placeholder="Builder, designer, marketer, student, etc." /></label>
              <label className="form-field">WhatsApp number<input required maxLength={32} name="whatsapp" type="tel" value={form.whatsapp} onChange={(event) => updateField("whatsapp", event.target.value)} placeholder="+62 812 3456 7890" /></label>
              <label className="form-field">How did you hear about us?<select required name="referralSource" value={form.referralSource} onChange={(event) => { updateField("referralSource", event.target.value as InterestForm["referralSource"]); updateField("referralName", ""); }}><option value="">Select an option...</option>{REFERRAL_SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              {form.referralSource === "friend" ? <label className="form-field">Who referred you?<input maxLength={120} name="referralName" value={form.referralName} onChange={(event) => updateField("referralName", event.target.value)} placeholder="Their name or WhatsApp handle" /></label> : null}
              {form.referralSource === "other" ? <label className="form-field">How did you find us?<input maxLength={120} name="referralName" value={form.referralName} onChange={(event) => updateField("referralName", event.target.value)} placeholder="e.g. Google search, blog post, event" /></label> : null}

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/55">
                We use your submitted details only for VFC community onboarding and related follow-up. Authorized VFC admins can review them. {publicForm.config ? <a className="text-yellow underline underline-offset-4" href={publicForm.config.privacyRequestUrl}>Request access, correction, or deletion.</a> : null}
              </div>
              <label className="flex items-start gap-3 text-sm leading-6 text-white/65">
                <input required className="mt-1 size-4" type="checkbox" checked={form.privacyConsent} onChange={(event) => updateField("privacyConsent", event.target.checked)} />
                <span>I agree that VFC may use my WhatsApp number and submitted details for community onboarding and related follow-up.</span>
              </label>
              {publicForm.config?.turnstileSiteKey ? (
                <TurnstileWidget
                  key={turnstileAttempt}
                  siteKey={publicForm.config.turnstileSiteKey}
                  action="join"
                  onToken={setTurnstileToken}
                  onError={handleTurnstileError}
                />
              ) : null}
              {publicForm.loading ? <p className="text-sm text-white/45">Loading form protection...</p> : null}
              {publicForm.error ? <p className="text-sm text-red-300">{publicForm.error}</p> : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              <button className="button bg-yellow text-midnight" type="submit" disabled={loading || !publicForm.config}>{loading ? "Submitting..." : "Express interest"} <ArrowRight size={16} /></button>
            </form>
          )}
        </div>
        <aside className="space-y-4">
          <div className="dark-card"><Users className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">{publicMemberCount}</h2><p className="mt-3 leading-7 text-white/50">Designers, engineers, founders, marketers, researchers, and the curious.</p></div>
          <div className="dark-card"><Sparkles className="text-yellow" /><h2 className="mt-8 text-2xl font-bold">No gatekeeping</h2><p className="mt-3 leading-7 text-white/50">Datang dengan rasa ingin tahu. Tinggalkan ruangan dengan sesuatu yang lebih nyata.</p></div>
        </aside>
      </div>
    </PageFrame>
  );
}
