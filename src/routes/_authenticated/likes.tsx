import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Photo } from "@/lib/storage";
import { ageFromBirthDate } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/likes")({
  head: () => ({
    meta: [
      { title: "მოწონებები — მარანი" },
      { name: "description", content: "ნახე ვინ მოგიწონა მარანში." },
      { property: "og:title", content: "მოწონებები — მარანი" },
      { property: "og:description", content: "ნახე ვინ მოგიწონა მარანში." },
    ],
  }),
  component: Likes,
});

function Likes() {
  const { user } = useSession();
  const uid = user!.id;
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["likes", uid],
    queryFn: async () => {
      const { data: incoming } = await supabase
        .from("swipes")
        .select("swiper_id, is_super")
        .eq("target_id", uid)
        .eq("liked", true);
      const { data: mine } = await supabase.from("swipes").select("target_id").eq("swiper_id", uid);
      const answered = new Set((mine ?? []).map((m) => m.target_id));
      const pending = (incoming ?? []).filter((s) => !answered.has(s.swiper_id));
      if (pending.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in(
          "id",
          pending.map((p) => p.swiper_id),
        );
      return ((profiles ?? []) as unknown as Profile[]).map((p) => ({
        profile: p,
        isSuper: pending.find((s) => s.swiper_id === p.id)?.is_super ?? false,
      }));
    },
  });

  async function respond(targetId: string, liked: boolean) {
    const { error } = await supabase
      .from("swipes")
      .insert({ swiper_id: uid, target_id: targetId, liked });
    if (error) {
      toast.error("ვერ შევინახეთ");
      return;
    }
    if (liked) toast.success("დამთხვევა! ახლა შეგიძლია მიწერო 💛");
    queryClient.invalidateQueries({ queryKey: ["likes", uid] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
  }

  return (
    <div>
      <PageHeader title="ვინ მოგიწონა" />
      <div className="px-5">
        {isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">იტვირთება…</p>
        ) : data.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">ჯერ არავის მოუწონიხარ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              შეავსე პროფილი ფოტოებით — ეს ყველაზე მეტად ეხმარება.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data.map(({ profile, isSuper }) => (
              <div
                key={profile.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <Photo
                  path={profile.photos[0] ?? profile.avatar_url}
                  alt={profile.full_name}
                  fallback={profile.full_name.slice(0, 1)}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="p-3">
                  <p className="font-semibold">
                    {profile.full_name}
                    {ageFromBirthDate(profile.birth_date) !== null &&
                      `, ${ageFromBirthDate(profile.birth_date)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.city}
                    {isSuper ? " · სუპერ მოწონება" : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => respond(profile.id, false)}
                      className="flex-1 rounded-lg border border-border py-1.5 text-xs"
                    >
                      არა
                    </button>
                    <button
                      onClick={() => respond(profile.id, true)}
                      className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      მოწონება
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
