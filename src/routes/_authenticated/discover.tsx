import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Heart, X, Star, MapPin, Briefcase, Ruler, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Photo } from "@/lib/storage";
import { ageFromBirthDate, CITIES } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "აღმოჩენა — მარანი" },
      { name: "description", content: "დაათვალიერე პროფილები მთელი საქართველოდან." },
      { property: "og:title", content: "აღმოჩენა — მარანი" },
      { property: "og:description", content: "დაათვალიერე პროფილები მთელი საქართველოდან." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { user } = useSession();
  const uid = user!.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [city, setCity] = useState<string>("all");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [showFilters, setShowFilters] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (error) throw error;
      return data as unknown as Profile;
    },
  });

  useEffect(() => {
    if (me && !me.onboarded) {
      toast.info("შეავსე პროფილი, რომ დაიწყო გაცნობა");
      navigate({ to: "/profile" });
    }
  }, [me, navigate]);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates", uid, me?.seeking, me?.gender],
    enabled: !!me?.onboarded,
    queryFn: async () => {
      const [{ data: swipes }, { data: blocks }] = await Promise.all([
        supabase.from("swipes").select("target_id").eq("swiper_id", uid),
        supabase.from("blocks").select("blocked_id").eq("blocker_id", uid),
      ]);
      const excluded = [
        uid,
        ...(swipes ?? []).map((s) => s.target_id),
        ...(blocks ?? []).map((b) => b.blocked_id),
      ];

      let query = supabase.from("profiles").select("*").eq("onboarded", true).limit(60);
      query = query.not("id", "in", `(${excluded.join(",")})`);
      if (me?.seeking && me.seeking !== "all") query = query.eq("gender", me.seeking);
      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as Profile[]).filter(
        (p) => p.seeking === "all" || p.seeking === me?.gender || !me?.gender,
      );
    },
  });

  const filtered = useMemo(
    () =>
      candidates.filter((p) => {
        if (city !== "all" && p.city !== city) return false;
        const age = ageFromBirthDate(p.birth_date);
        if (age !== null && (age < minAge || age > maxAge)) return false;
        return true;
      }),
    [candidates, city, minAge, maxAge],
  );

  const current = filtered[index];

  async function swipe(liked: boolean, isSuper = false) {
    if (!current) return;
    setIndex((i) => i + 1);
    const { error } = await supabase
      .from("swipes")
      .insert({ swiper_id: uid, target_id: current.id, liked, is_super: isSuper });
    if (error) {
      toast.error("ვერ შევინახეთ, სცადე ხელახლა");
      return;
    }
    if (liked) {
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(`user_a.eq.${current.id},user_b.eq.${current.id}`)
        .limit(1)
        .maybeSingle();
      if (match) {
        toast.success(`დამთხვევა! ${current.full_name} შენც მოგიწონა 💛`);
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="აღმოჩენა"
        action={
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium"
          >
            <SlidersHorizontal className="size-3.5" /> ფილტრი
          </button>
        }
      />

      {showFilters && (
        <div className="mx-5 mb-4 space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">ქალაქი</p>
            <div className="flex flex-wrap gap-2">
              {["all", ...CITIES].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCity(c);
                    setIndex(0);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    city === c
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background"
                  }`}
                >
                  {c === "all" ? "ყველა" : c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-muted-foreground">ასაკი</p>
            <input
              type="number"
              min={18}
              max={99}
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
              className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              min={18}
              max={99}
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      <div className="px-5">
        {isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">იტვირთება…</p>
        ) : !current ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">ამჟამად ახალი პროფილები არ არის</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              შეცვალე ფილტრები ან შემოიარე მოგვიანებით.
            </p>
          </div>
        ) : (
          <>
            <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
              <Photo
                path={current.photos[0] ?? current.avatar_url}
                alt={current.full_name}
                fallback={current.full_name.slice(0, 1)}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="p-5">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-semibold">{current.full_name}</h2>
                  <span className="text-xl text-muted-foreground">
                    {ageFromBirthDate(current.birth_date)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {current.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" /> {current.city}
                    </span>
                  )}
                  {current.occupation && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="size-3.5" /> {current.occupation}
                    </span>
                  )}
                  {current.height_cm && (
                    <span className="flex items-center gap-1">
                      <Ruler className="size-3.5" /> {current.height_cm} სმ
                    </span>
                  )}
                </div>
                {current.bio && <p className="mt-3 text-sm leading-relaxed">{current.bio}</p>}
                {current.interests.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {current.interests.map((i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border px-3 py-1 text-xs text-primary"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>

            <div className="mt-5 flex items-center justify-center gap-6">
              <button
                onClick={() => swipe(false)}
                aria-label="გამოტოვება"
                className="grid size-14 place-items-center rounded-full border border-border bg-card text-muted-foreground"
              >
                <X className="size-6" />
              </button>
              <button
                onClick={() => swipe(true, true)}
                aria-label="სუპერ მოწონება"
                className="grid size-12 place-items-center rounded-full border border-border bg-card text-gold"
              >
                <Star className="size-5" />
              </button>
              <button
                onClick={() => swipe(true)}
                aria-label="მოწონება"
                className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
              >
                <Heart className="size-7" />
              </button>
            </div>

            <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
              <button
                onClick={async () => {
                  await supabase.from("blocks").insert({ blocker_id: uid, blocked_id: current.id });
                  setIndex((i) => i + 1);
                  toast.success("მომხმარებელი დაბლოკილია");
                }}
              >
                დაბლოკვა
              </button>
              <button
                onClick={async () => {
                  await supabase
                    .from("reports")
                    .insert({ reporter_id: uid, reported_id: current.id, reason: "სხვა" });
                  setIndex((i) => i + 1);
                  toast.success("საჩივარი გაგზავნილია");
                }}
              >
                საჩივარი
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
