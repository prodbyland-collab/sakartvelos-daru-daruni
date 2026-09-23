import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Photo } from "@/lib/storage";
import type { MatchRow, MessageRow, Profile } from "@/lib/types";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({
    meta: [
      { title: "ჩატები — მარანი" },
      { name: "description", content: "შენი დამთხვევები და მიმოწერა." },
      { property: "og:title", content: "ჩატები — მარანი" },
      { property: "og:description", content: "შენი დამთხვევები და მიმოწერა." },
    ],
  }),
  component: Matches,
});

function Matches() {
  const { user } = useSession();
  const uid = user!.id;

  const { data = [], isLoading } = useQuery({
    queryKey: ["matches", uid],
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });
      const rows = (matches ?? []) as unknown as MatchRow[];
      if (rows.length === 0) return [];

      const otherIds = rows.map((m) => (m.user_a === uid ? m.user_b : m.user_a));
      const [{ data: profiles }, { data: messages }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", otherIds),
        supabase
          .from("messages")
          .select("*")
          .in(
            "match_id",
            rows.map((m) => m.id),
          )
          .order("created_at", { ascending: false }),
      ]);
      const profileList = (profiles ?? []) as unknown as Profile[];
      const messageList = (messages ?? []) as unknown as MessageRow[];

      return rows.map((m) => {
        const otherId = m.user_a === uid ? m.user_b : m.user_a;
        return {
          match: m,
          profile: profileList.find((p) => p.id === otherId),
          lastMessage: messageList.find((msg) => msg.match_id === m.id) ?? null,
        };
      });
    },
  });

  return (
    <div>
      <PageHeader title="ჩატები" />
      <div className="px-5">
        {isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">იტვირთება…</p>
        ) : data.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">ჯერ დამთხვევები არ გაქვს</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              დაიწყე მოწონებებით — საუბარი ორმხრივი ინტერესის შემდეგ იხსნება.
            </p>
            <Link
              to="/discover"
              className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              აღმოჩენაზე გადასვლა
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {data.map(({ match, profile, lastMessage }) => (
              <li key={match.id}>
                <Link
                  to="/chat/$matchId"
                  params={{ matchId: match.id }}
                  className="flex items-center gap-3 p-3.5"
                >
                  <Photo
                    path={profile?.photos[0] ?? profile?.avatar_url}
                    alt={profile?.full_name ?? ""}
                    fallback={(profile?.full_name ?? "?").slice(0, 1)}
                    className="size-14 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{profile?.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {lastMessage?.content ?? "დაწერე პირველი შეტყობინება"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
