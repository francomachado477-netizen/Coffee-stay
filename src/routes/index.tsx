import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroCup from "@/assets/hero-cup.jpg";
import pour from "@/assets/pour.jpg";
import shop from "@/assets/shop.jpg";
import beans from "@/assets/beans.jpg";
import { createReservation } from "@/lib/reservations.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coffee Stay — A small room. A long pour. Stay a while." },
      {
        name: "description",
        content:
          "Coffee Stay is a slow coffee bar pouring single-origin espresso and quiet mornings. Reserve a table, see the menu, find us on Linden St.",
      },
      { property: "og:title", content: "Coffee Stay" },
      {
        property: "og:description",
        content: "Slow coffee, single-origin espresso, and an unhurried room.",
      },
    ],
  }),
  component: Index,
});

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// fire-and-forget analytics
function track(event_type: string, target_id?: string | null, target_label?: string | null) {
  try {
    void supabase.from("analytics_events").insert({
      event_type,
      target_id: target_id ?? null,
      target_label: target_label ?? null,
    });
  } catch {
    // ignore
  }
}

function useSettings() {
  return useQuery({
    queryKey: ["public", "site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => (map[r.key] = r.value));
      return map;
    },
    initialData: {},
  });
}

function Index() {
  useReveal();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // page view (once per mount)
  useEffect(() => {
    track("page_view");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav scrolled={scrolled} />
      <Hero />
      <Marquee />
      <Menu />
      <Story />
      <Visit />
      <Footer />
      <FloatingSocial />
    </div>
  );
}

function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <a href="#top" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-tight">Coffee Stay</span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            est. 2021
          </span>
        </a>
        <ul className="hidden gap-9 text-sm md:flex">
          {[
            ["Menu", "#menu"],
            ["Our story", "#story"],
            ["Visit", "#visit"],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="text-foreground/70 transition hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#visit"
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-background transition hover:bg-accent"
        >
          Reserve
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="grain relative isolate overflow-hidden min-h-[100svh] flex items-end"
    >
      <img
        src={heroCup}
        alt="A ceramic cup of black coffee on a warm linen surface with scattered beans"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        style={{ filter: "saturate(0.92) contrast(0.98)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--espresso) 55%, transparent) 0%, color-mix(in oklab, var(--espresso) 35%, transparent) 40%, color-mix(in oklab, var(--espresso) 85%, transparent) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 70% 30%, transparent 40%, color-mix(in oklab, var(--espresso) 60%, transparent) 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-40 md:px-10 md:pb-28 md:pt-44">
        <div className="max-w-3xl text-cream">
          <p className="reveal mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-cream/75">
            <span className="inline-block h-px w-8 bg-accent" />
            No. 24 Linden St — open today
          </p>
          <h1 className="reveal font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] tracking-tight text-cream">
            A small room.
            <br />
            <span className="italic text-accent">A long pour.</span>
            <br />
            Stay a while.
          </h1>
          <p className="reveal mt-8 max-w-md text-base leading-relaxed text-cream/85 md:text-lg">
            Coffee Stay is twelve seats, one espresso machine, and a barista who
            remembers your name by Thursday. We pour single-origin coffee for
            people who'd rather sit than scroll.
          </p>
          <div className="reveal mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#visit"
              className="group inline-flex items-center gap-3 rounded-full bg-cream px-7 py-4 text-sm font-medium text-espresso transition hover:bg-accent hover:text-cream"
            >
              Reserve a table
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#menu"
              className="inline-flex items-center gap-2 text-sm font-medium text-cream underline decoration-accent decoration-2 underline-offset-[6px] transition hover:text-accent"
            >
              See what's brewing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const phrases = [
    "Single origin",
    "Slow bar",
    "House-roasted weekly",
    "Twelve seats",
    "Quiet mornings",
    "Cardamom latte",
    "No oat-milk surcharge",
    "Stay a while",
  ];
  const loop = [...phrases, ...phrases];
  return (
    <section
      aria-hidden
      className="border-y border-border bg-foreground py-6 text-background overflow-hidden"
    >
      <div className="marquee-track gap-12 whitespace-nowrap font-display text-2xl md:text-3xl">
        {loop.map((p, i) => (
          <span key={i} className="flex items-center gap-12">
            {p}
            <span className="text-accent">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  sort_order: number;
  image_url: string | null;
  out_of_stock: boolean;
};

function Menu() {
  const { data, isLoading } = useQuery({
    queryKey: ["public", "menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price, sort_order, image_url, out_of_stock")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MenuItem[];
    },
  });
  const items = (data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const inStock = items.filter((i) => !i.out_of_stock);
  const outStock = items.filter((i) => i.out_of_stock);

  return (
    <section id="menu" className="py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="reveal mb-16 flex flex-col items-start justify-between gap-6 md:mb-20 md:flex-row md:items-end">
          <div>
            <p className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <span className="inline-block h-px w-8 bg-accent" /> The bar
            </p>
            <h2 className="font-display text-5xl leading-[1] md:text-7xl">
              What's <span className="italic text-accent">pouring</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            A short menu, on purpose. Everything we serve, we drink ourselves —
            usually twice before opening.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading menu…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">The menu is being updated.</p>
        )}

        <MenuList items={inStock} startIndex={0} />

        {outStock.length > 0 && (
          <div className="mt-16">
            <p className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <span className="inline-block h-px w-8 bg-accent" /> No stock
            </p>
            <MenuList items={outStock} startIndex={inStock.length} dimmed />
          </div>
        )}

        <div className="reveal mt-16 flex flex-col items-start gap-4">
          <ReviewWidget />
        </div>
      </div>
    </section>
  );
}

function MenuList({
  items,
  startIndex,
  dimmed,
}: {
  items: MenuItem[];
  startIndex: number;
  dimmed?: boolean;
}) {
  return (
    <ul className={`divide-y divide-border border-y border-border ${dimmed ? "opacity-60" : ""}`}>
      {items.map((item, i) => (
        <li
          key={item.id}
          className="reveal group grid grid-cols-12 items-center gap-4 py-7 transition hover:bg-foreground/[0.02] md:gap-8 md:py-9"
          onClick={() => track("click_menu_item", item.id, item.name)}
        >
          <span className="col-span-2 font-display text-xs text-muted-foreground md:col-span-1 md:text-sm">
            {String(startIndex + i + 1).padStart(2, "0")}
          </span>
          {item.image_url ? (
            <div className="col-span-3 md:col-span-2">
              <img
                src={item.image_url}
                alt={item.name}
                loading="lazy"
                className="h-16 w-16 rounded object-cover md:h-20 md:w-20"
              />
            </div>
          ) : (
            <div className="hidden md:block md:col-span-2" />
          )}
          <div className="col-span-7 md:col-span-4">
            <h3 className="font-display text-2xl transition group-hover:text-accent md:text-3xl">
              {item.name}
              {item.out_of_stock && (
                <span className="ml-3 align-middle text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Sold out
                </span>
              )}
            </h3>
          </div>
          <p className="col-span-9 col-start-4 text-sm leading-relaxed text-muted-foreground md:col-span-3 md:col-start-auto md:text-base">
            {item.description}
          </p>
          <span className="col-span-3 col-start-12 text-right font-display text-xl md:col-span-2 md:text-2xl">
            ${Number(item.price).toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Story() {
  return (
    <section
      id="story"
      className="relative isolate overflow-hidden py-28 text-cream md:py-40"
    >
      <img
        src={shop}
        alt="Interior of Coffee Stay, warm light through tall window, single person reading"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        loading="lazy"
        style={{ filter: "saturate(0.85) contrast(1.02) brightness(0.7)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--espresso) 88%, transparent) 0%, color-mix(in oklab, var(--espresso) 60%, transparent) 55%, color-mix(in oklab, var(--espresso) 30%, transparent) 100%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-12 md:gap-12 md:px-10">
        <div className="md:col-span-7">
          <p className="reveal mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-cream/60">
            <span className="inline-block h-px w-8 bg-accent" /> Since 2021
          </p>
          <h2 className="reveal font-display text-4xl leading-[1.05] text-cream md:text-6xl">
            We opened in a room that used to be a
            <span className="italic text-accent"> tailor's shop</span>.
          </h2>
          <div className="reveal mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-cream/85 md:text-lg">
            <p>
              The hooks for the suits are still in the wall. We hang aprons on
              them now. The light comes in from one window on the east side and
              we set the machines up to chase it.
            </p>
            <p>
              We work with two roasters we like — a small one in Lisbon, a
              smaller one upstate — and rotate beans every couple of weeks.
            </p>
          </div>
        </div>
        <div className="reveal md:col-span-5 md:pt-12">
          <div className="relative aspect-[4/5] w-full overflow-hidden border border-cream/15">
            <img
              src={beans}
              alt="Close-up of fresh roasted coffee beans"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Visit() {
  return (
    <section id="visit" className="py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-12 md:gap-12 md:px-10">
        <div className="md:col-span-5">
          <p className="reveal mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-accent" /> Visit
          </p>
          <h2 className="reveal font-display text-5xl leading-[1] md:text-7xl">
            Pull up a <span className="italic text-accent">chair</span>.
          </h2>
          <p className="reveal mt-6 max-w-sm text-muted-foreground">
            Walk-ins always welcome. Tables hold for ten minutes after your
            reserved time.
          </p>
          <dl className="reveal mt-12 space-y-6">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Address
              </dt>
              <dd className="mt-1 font-display text-xl">
                24 Linden Street
                <br />
                Brooklyn, NY 11216
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Hours
              </dt>
              <dd className="mt-1 font-display text-xl">
                Mon — Fri · 6:00 – 16:00
                <br />
                Sat — Sun · 7:30 – 17:00
              </dd>
            </div>
          </dl>
        </div>
        <div className="reveal md:col-span-7">
          <ReservationForm />
        </div>
      </div>
    </section>
  );
}

type ReservationStatus = "idle" | "submitting" | "done";

function ReservationForm() {
  const submit = useServerFn(createReservation);
  const [status, setStatus] = useState<ReservationStatus>("idle");
  const [confirmation, setConfirmation] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      date: String(fd.get("date") ?? ""),
      time: String(fd.get("time") ?? ""),
      guests: Number(fd.get("guests") ?? 2),
      note: String(fd.get("note") ?? ""),
    };
    setStatus("submitting");
    setErrorMsg("");
    try {
      await submit({ data: payload });
      track("reservation_created");
      setConfirmation(
        `${payload.name.split(" ")[0] || "You"}, table for ${payload.guests} on ${payload.date} at ${payload.time} — we'll confirm shortly.`,
      );
      setStatus("done");
      formRef.current?.reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save reservation.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div className="grain relative flex h-full min-h-[460px] flex-col items-start justify-between rounded-sm border border-border bg-card p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Confirmed</p>
        <div>
          <h3 className="font-display text-4xl leading-tight md:text-5xl">
            See you soon.
          </h3>
          <p className="mt-4 max-w-md text-muted-foreground">{confirmation}</p>
        </div>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm underline decoration-accent underline-offset-4 transition hover:text-accent"
        >
          Book another table
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grain relative rounded-sm border border-border bg-card p-8 md:p-12"
    >
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Reserve a table
      </p>
      <h3 className="mb-8 font-display text-3xl md:text-4xl">
        Save a seat by the window.
      </h3>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name" name="name" type="text" placeholder="Your name" required />
        <Field label="WhatsApp Number" name="whatsapp" type="tel" placeholder="+1 555 123 4567" required />
        <Field label="Date" name="date" type="date" required />
        <Field label="Time" name="time" type="time" defaultValue="09:00" required />
        <div className="md:col-span-2">
          <Label>Guests</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((g, i) => (
              <label key={g} className="cursor-pointer">
                <input
                  type="radio"
                  name="guests"
                  value={g}
                  defaultChecked={i === 1}
                  className="peer sr-only"
                />
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border font-display text-lg transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background hover:border-foreground/60">
                  {g}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Label>Note (optional)</Label>
          <textarea
            name="note"
            rows={3}
            placeholder="Anniversary, working on a novel, etc."
            className="mt-2 w-full resize-none border-0 border-b border-border bg-transparent py-2 text-base outline-none transition focus:border-foreground"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="group mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-background transition hover:bg-accent disabled:opacity-60 md:w-auto"
      >
        {status === "submitting" ? "Saving…" : "Confirm reservation"}
        <span aria-hidden className="transition group-hover:translate-x-1">→</span>
      </button>
      {errorMsg && <p className="mt-3 text-xs text-red-600">{errorMsg}</p>}
      <p className="mt-4 text-xs text-muted-foreground">
        We'll hold your table for 10 minutes after the time you pick.
      </p>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </span>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        {...props}
        className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-base outline-none transition focus:border-foreground"
      />
    </label>
  );
}

function ReviewWidget() {
  const { data: settings } = useSettings();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const mapsUrl = settings?.google_maps_url || "";

  const submit = async (value: number) => {
    setRating(value);
    setSubmitted(true);
    try {
      await supabase.from("reviews").insert({ rating: value });
      track("review_submitted", null, String(value));
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full rounded-sm border border-border bg-card p-6 md:p-8">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rate your visit</p>
      <h3 className="mt-2 font-display text-2xl md:text-3xl">How was your stay?</h3>
      <div className="mt-4 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((v) => {
          const active = (hover || rating) >= v;
          return (
            <button
              key={v}
              type="button"
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onClick={() => submit(v)}
              aria-label={`${v} star${v > 1 ? "s" : ""}`}
              className={`text-3xl transition ${active ? "text-accent" : "text-muted-foreground/40"}`}
            >
              ★
            </button>
          );
        })}
      </div>
      {submitted && rating >= 4 && (
        <div className="mt-4 text-sm">
          <p className="text-foreground">Thank you — we'd love it if you shared a kind word.</p>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.18em] text-background hover:bg-accent"
            >
              Leave a Google review →
            </a>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Google review link coming soon.</p>
          )}
        </div>
      )}
      {submitted && rating > 0 && rating < 4 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for the honest feedback — we'll do better next time.
        </p>
      )}
    </div>
  );
}

function FloatingSocial() {
  const { data: settings } = useSettings();
  const ig = settings?.instagram_url || "";
  const wa = settings?.whatsapp_url || "";
  if (!ig && !wa) return null;
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("click_whatsapp")}
          aria-label="Contact us on WhatsApp"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path d="M20.5 3.5A11.8 11.8 0 0012.05 0C5.5 0 .2 5.3.2 11.85c0 2.1.55 4.15 1.6 5.95L0 24l6.35-1.65a11.85 11.85 0 005.7 1.45h.01c6.55 0 11.85-5.3 11.85-11.85 0-3.15-1.25-6.15-3.4-8.45zm-8.45 18.2h-.01a9.85 9.85 0 01-5-1.35l-.35-.2-3.75.95.95-3.65-.25-.4a9.85 9.85 0 01-1.5-5.2c0-5.45 4.45-9.9 9.95-9.9 2.65 0 5.15 1.05 7 2.9a9.85 9.85 0 012.9 7c0 5.45-4.45 9.85-9.95 9.85zm5.45-7.4c-.3-.15-1.75-.85-2-.95-.3-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.15-.2.15-.35.2-.65.05-1.75-.9-2.9-1.55-4.05-3.5-.3-.55.3-.5.9-1.7.1-.2.05-.35-.05-.5s-.65-1.6-.9-2.2c-.25-.55-.5-.5-.65-.5h-.55c-.2 0-.5.05-.75.35-.25.3-1 1-1 2.4s1.05 2.8 1.2 3c.15.2 2 3.1 4.95 4.35 1.85.8 2.55.85 3.45.7.55-.05 1.75-.7 2-1.4.25-.7.25-1.3.15-1.4-.1-.1-.3-.15-.6-.3z"/>
          </svg>
        </a>
      )}
      {ig && (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("click_instagram")}
          aria-label="Follow us on Instagram"
          className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
          style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.43.37 1.06.42 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.17-1.06.37-2.23.42-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.17-.43-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.16 0-3.53.01-4.77.07-.95.04-1.46.2-1.8.34-.45.18-.78.39-1.12.73-.34.34-.55.67-.73 1.12-.13.34-.3.85-.34 1.8-.06 1.24-.07 1.6-.07 4.77s.01 3.53.07 4.77c.04.95.2 1.46.34 1.8.18.45.39.78.73 1.12.34.34.67.55 1.12.73.34.13.85.3 1.8.34 1.24.06 1.6.07 4.77.07s3.53-.01 4.77-.07c.95-.04 1.46-.2 1.8-.34.45-.18.78-.39 1.12-.73.34-.34.55-.67.73-1.12.13-.34.3-.85.34-1.8.06-1.24.07-1.6.07-4.77s-.01-3.53-.07-4.77c-.04-.95-.2-1.46-.34-1.8a3 3 0 00-.73-1.12 3 3 0 00-1.12-.73c-.34-.13-.85-.3-1.8-.34C15.53 4.01 15.16 4 12 4zm0 3.04a4.96 4.96 0 110 9.92 4.96 4.96 0 010-9.92zm0 1.8a3.16 3.16 0 100 6.32 3.16 3.16 0 000-6.32zm5.16-2a1.16 1.16 0 110 2.33 1.16 1.16 0 010-2.33z"/>
          </svg>
        </a>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center md:px-10">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg">Coffee Stay</span>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Brooklyn — since 2021
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <a href="#menu" className="transition hover:text-foreground">Menu</a>
          <a href="#story" className="transition hover:text-foreground">Story</a>
          <a href="#visit" className="transition hover:text-foreground">Visit</a>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition hover:bg-foreground hover:text-background"
          >
            Administrative panel
            <span aria-hidden>→</span>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Coffee Stay. Made slow.
        </p>
      </div>
      <img src={pour} alt="" className="hidden" aria-hidden />
    </footer>
  );
}
