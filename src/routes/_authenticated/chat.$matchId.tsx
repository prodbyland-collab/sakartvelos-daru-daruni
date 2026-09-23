import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Photo } from "@/lib/storage";
import type { MatchRow, MessageRow, Profile } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/chat/$matchId")({
  head: () => ({
    meta: [
      { title: "საუბარი — მარანი" },
      { name: "description", content: "მიმოწერა შენს დამთხვევასთან." },
      { property: "og:title", content: "საუბარი — მარანი" },
      { property: "og:description", content: "მიმოწერა შენს დამთხვევასთან." },
    ],
  }),
  component: Chat,
});

function Chat() {
  const { matchId } = Route.useParams();
  const { user } = useSession();
  const uid = user!.id;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: other } = useQuery({
    queryKey: ["match-partner", matchId, uid],
    queryFn: async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (!match) return null;
      const row = match as unknown as MatchRow;
      const otherId = row.user_a === uid ? row.user_b : row.user_a;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .maybeSingle();
      return (profile ?? null) as unknown as Profile | null;
    },
  });

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as unknown as MessageRow[]);
      });

    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: uid, content })
      .select()
      .single();
    if (error) {
      toast.error("შეტყობინება ვერ გაიგზავნა");
      setText(content);
      return;
    }
    const row = data as unknown as MessageRow;
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/matches" className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <Photo
          path={other?.photos[0] ?? other?.avatar_url}
          alt={other?.full_name ?? ""}
          fallback={(other?.full_name ?? "?").slice(0, 1)}
          className="size-9 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold leading-tight">{other?.full_name ?? "…"}</p>
          <p className="text-[11px] text-muted-foreground">{other?.city}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            თქვენ დაემთხვიეთ! დაწერე პირველი შეტყობინება.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === uid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card"
                }`}
              >
                {m.content}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-20 mx-4 mb-2 flex items-center gap-2 rounded-full border border-border bg-card p-1.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="შეტყობინება…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="გაგზავნა"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
