import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Photo, uploadPhoto } from "@/lib/storage";
import { CITIES, GENDERS, INTERESTS, SEEKING, ageFromBirthDate } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "ჩემი პროფილი — მარანი" },
      { name: "description", content: "შეავსე და დაარედაქტირე შენი პროფილი მარანში." },
      { property: "og:title", content: "ჩემი პროფილი — მარანი" },
      { property: "og:description", content: "შეავსე და დაარედაქტირე შენი პროფილი მარანში." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const uid = user!.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (error) throw error;
      return data as unknown as Profile;
    },
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleInterest(interest: string) {
    const current = form.interests ?? [];
    set(
      "interests",
      current.includes(interest) ? current.filter((i) => i !== interest) : [...current, interest],
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadPhoto(uid, file);
      const photos = [...(form.photos ?? []), path];
      set("photos", photos);
      await supabase.from("profiles").update({ photos }).eq("id", uid);
      toast.success("ფოტო დაემატა");
    } catch {
      toast.error("ფოტო ვერ აიტვირთა");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removePhoto(path: string) {
    const photos = (form.photos ?? []).filter((p) => p !== path);
    set("photos", photos);
    await supabase.from("profiles").update({ photos }).eq("id", uid);
    await supabase.storage.from("photos").remove([path]);
  }

  async function save() {
    const age = ageFromBirthDate(form.birth_date ?? null);
    if (!form.full_name?.trim()) return toast.error("შეიყვანე სახელი");
    if (age === null || age < 18) return toast.error("საიტით სარგებლობა შესაძლებელია 18 წლიდან");
    if (!form.gender) return toast.error("მიუთითე სქესი");
    if (!form.city) return toast.error("აირჩიე ქალაქი");

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        birth_date: form.birth_date,
        gender: form.gender,
        seeking: form.seeking ?? "all",
        city: form.city,
        bio: form.bio ?? "",
        occupation: form.occupation,
        height_cm: form.height_cm,
        interests: form.interests ?? [],
        onboarded: true,
        last_seen: new Date().toISOString(),
      })
      .eq("id", uid);
    setSaving(false);
    if (error) {
      toast.error("ვერ შევინახეთ");
      return;
    }
    toast.success("პროფილი შენახულია");
    queryClient.invalidateQueries({ queryKey: ["profile", uid] });
    queryClient.invalidateQueries({ queryKey: ["candidates"] });
    if (!profile?.onboarded) navigate({ to: "/discover" });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const input =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="pb-8">
      <PageHeader
        title="ჩემი პროფილი"
        action={
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"
          >
            <LogOut className="size-3.5" /> გასვლა
          </button>
        }
      />

      <div className="space-y-6 px-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">ფოტოები</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(form.photos ?? []).map((p) => (
              <div key={p} className="relative shrink-0">
                <Photo
                  path={p}
                  alt="ფოტო"
                  className="h-28 w-24 rounded-xl object-cover"
                  fallback="•"
                />
                <button
                  onClick={() => removePhoto(p)}
                  aria-label="წაშლა"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <label className="grid h-28 w-24 shrink-0 cursor-pointer place-items-center rounded-xl border border-dashed border-border text-muted-foreground">
              {uploading ? (
                <span className="text-xs">…</span>
              ) : (
                <Plus className="size-5" />
              )}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <input
            className={input}
            placeholder="სახელი"
            value={form.full_name ?? ""}
            onChange={(e) => set("full_name", e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">დაბადების თარიღი</label>
            <input
              type="date"
              className={input}
              value={form.birth_date ?? ""}
              onChange={(e) => set("birth_date", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className={input}
              placeholder="პროფესია"
              value={form.occupation ?? ""}
              onChange={(e) => set("occupation", e.target.value)}
            />
            <input
              type="number"
              className={input}
              placeholder="სიმაღლე (სმ)"
              value={form.height_cm ?? ""}
              onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <textarea
            className={`${input} min-h-28`}
            placeholder="მოკლედ შენს შესახებ…"
            value={form.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">სქესი</h2>
          <div className="flex gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => set("gender", g.value)}
                className={`rounded-full px-4 py-2 text-sm ${
                  form.gender === g.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">ვის ვეძებ</h2>
          <div className="flex gap-2">
            {SEEKING.map((s) => (
              <button
                key={s.value}
                onClick={() => set("seeking", s.value)}
                className={`rounded-full px-4 py-2 text-sm ${
                  (form.seeking ?? "all") === s.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">ქალაქი</h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c}
                onClick={() => set("city", c)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  form.city === c ? "bg-primary text-primary-foreground" : "border border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">ინტერესები</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                key={i}
                onClick={() => toggleInterest(i)}
                className={`rounded-full px-3.5 py-1.5 text-sm ${
                  (form.interests ?? []).includes(i)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "ინახება…" : "შენახვა"}
        </button>
      </div>
    </div>
  );
}
