import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, ShieldCheck, MapPin } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { useSession } from "@/lib/session";
import { CITIES } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "მარანი — გაიცანი შენი ადამიანი საქართველოში" },
      {
        name: "description",
        content:
          "მარანი არის ქართული საგაცნობო საიტი — პროფილები, მოწონებები, დამთხვევები და ჩატი მხოლოდ საქართველოსთვის.",
      },
      { property: "og:title", content: "მარანი — ქართული საგაცნობო საიტი" },
      {
        property: "og:description",
        content: "გაიცანი ადამიანები თბილისში, ბათუმში, ქუთაისსა და მთელ საქართველოში.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session } = useSession();
  const target = session ? "/discover" : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-serif text-lg font-bold text-primary-foreground">
            მ
          </span>
          <span className="font-serif text-lg font-semibold">მარანი</span>
        </div>
        <Link
          to={target}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {session ? "აპლიკაციაში" : "შესვლა"}
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:items-center md:pt-14">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-leaf">
            მხოლოდ საქართველო
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold text-balance md:text-5xl">
            გაიცანი შენი ადამიანი <span className="text-primary">აქვე, საქართველოში</span>
          </h1>
          <p className="mt-4 max-w-md text-pretty text-muted-foreground">
            მარანი ქართული საგაცნობო პლატფორმაა. ნამდვილი პროფილები, ორმხრივი მოწონებები და
            მშვიდი საუბრები — თბილისიდან ბათუმამდე.
          </p>
          <Link
            to={target}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-[0.99] sm:w-auto"
          >
            დაიწყე უფასოდ
            <Heart className="size-4" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            რეგისტრაცია ელფოსტით ან Google-ით · 18+
          </p>
        </div>

        <div className="relative">
          <img
            src={heroImage}
            alt="წყვილი თბილისურ ეზოში"
            width={1280}
            height={1600}
            className="w-full rounded-3xl object-cover shadow-[var(--shadow-card)]"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-semibold">რას გთავაზობს მარანი</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Heart,
              title: "ორმხრივი მოწონება",
              text: "მოიწონე პროფილები და დაელოდე დამთხვევას — საუბარი მხოლოდ ორმხრივი ინტერესით იწყება.",
            },
            {
              icon: MessageCircle,
              title: "ცოცხალი ჩატი",
              text: "შეტყობინებები რეალურ დროში, დამთხვეულ ადამიანებთან.",
            },
            {
              icon: ShieldCheck,
              title: "უსაფრთხოება",
              text: "დაბლოკვა და საჩივარი ერთი შეხებით. შენს მონაცემებს მხოლოდ შენ აკონტროლებ.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 text-primary" />
          ქალაქები
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted-foreground">
          მარანი · საქართველო
        </div>
      </footer>
    </div>
  );
}
