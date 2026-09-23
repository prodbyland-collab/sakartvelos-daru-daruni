import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "შესვლა — მარანი" },
      { name: "description", content: "შედი მარანში ან შექმენი ახალი ანგარიში." },
      { property: "og:title", content: "შესვლა — მარანი" },
      { property: "og:description", content: "შედი მარანში ან შექმენი ახალი ანგარიში." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/discover", replace: true });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("გამოგზავნილია დამადასტურებელი ბმული ელფოსტაზე");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google-ით შესვლა ვერ მოხერხდა");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/discover" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-serif text-lg font-bold text-primary-foreground">
            მ
          </span>
          <span className="font-serif text-lg font-semibold">მარანი</span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold">
            {mode === "in" ? "კეთილი იყოს შენი დაბრუნება" : "შექმენი ანგარიში"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "in"
              ? "შედი და გააგრძელე გაცნობა."
              : "რამდენიმე წამში მზად იქნები გასაცნობად."}
          </p>

          {sent ? (
            <p className="mt-6 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
              შეამოწმე ელფოსტა და დაადასტურე მისამართი — შემდეგ დაბრუნდი და შედი.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-3">
              {mode === "up" && (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="სახელი"
                  required
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ელფოსტა"
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="პაროლი"
                required
                minLength={6}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "დაელოდე…" : mode === "in" ? "შესვლა" : "რეგისტრაცია"}
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ან <span className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            className="w-full rounded-xl border border-input bg-background py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            გაგრძელება Google-ით
          </button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "in" ? "არ გაქვს ანგარიში?" : "უკვე გაქვს ანგარიში?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setSent(false);
              }}
              className="font-semibold text-primary"
            >
              {mode === "in" ? "რეგისტრაცია" : "შესვლა"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
