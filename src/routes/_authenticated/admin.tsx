import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  listAllMenu,
  upsertMenuItem,
  softDeleteMenu,
  restoreMenu,
  hardDeleteMenu,
} from "@/lib/menu.functions";
import {
  listReservations,
  setReservationStatus,
  softDeleteReservation,
  restoreReservation,
  hardDeleteReservation,
} from "@/lib/reservations.functions";
import { listReviewsAdmin } from "@/lib/reviews.functions";
import { getAdminStats } from "@/lib/stats.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — Coffee Stay" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AdminPage,
});

type Tab = "menu" | "reservations" | "stats" | "settings" | "reviews" | "trash";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(checkIsAdmin);
  const [tab, setTab] = useState<Tab>("menu");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin({})
      .then((r) => setAuthorized(r.isAdmin))
      .catch(() => setAuthorized(false));
  }, [checkAdmin]);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth" });
  };

  if (authorized === null) {
    return <div className="p-10 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10">
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl">Not authorized</h1>
          <button
            onClick={signOut}
            className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] text-background"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const tabs: [Tab, string][] = [
    ["menu", "Menu"],
    ["reservations", "Reservations"],
    ["stats", "Statistics"],
    ["reviews", "Reviews"],
    ["settings", "Settings"],
    ["trash", "Trash"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-baseline gap-3">
            <a href="/" className="font-display text-xl">
              Coffee Stay
            </a>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Admin
            </span>
          </div>
          <button
            onClick={signOut}
            className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-6 md:px-10">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px shrink-0 border-b-2 py-4 text-sm transition ${
                tab === k
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        {tab === "menu" && <MenuPanel />}
        {tab === "reservations" && <ReservationsPanel />}
        {tab === "stats" && <StatsPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "trash" && <TrashPanel />}
      </main>
    </div>
  );
}

// ───────────── Menu ─────────────

type MenuRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  sort_order: number;
  image_url: string | null;
  out_of_stock: boolean;
  deleted_at: string | null;
};

function MenuPanel() {
  const fetchAll = useServerFn(listAllMenu);
  const upsert = useServerFn(upsertMenuItem);
  const softDel = useServerFn(softDeleteMenu);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const q = useQuery({
    queryKey: ["admin", "menu"],
    queryFn: () => fetchAll({}) as Promise<MenuRow[]>,
  });
  const active = (q.data ?? []).filter((m) => !m.deleted_at);

  const onSave = async (row: Partial<MenuRow> & { name: string; price: number }) => {
    setMessage(null);
    try {
      const saved = await upsert({
        data: {
          id: row.id,
          name: row.name.trim(),
          description: row.description?.trim() ?? "",
          price: Number(row.price),
          sort_order: Number(row.sort_order ?? 0),
          image_url: row.image_url?.trim() || null,
          out_of_stock: !!row.out_of_stock,
        },
      });
      await q.refetch();
      setMessage({
        type: "success",
        text: row.id ? "Product updated in Supabase." : "Product created in Supabase.",
      });
      return saved;
    } catch (err) {
      const text = err instanceof Error ? err.message : "Could not save product.";
      setMessage({ type: "error", text });
      throw err;
    }
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-display text-3xl">Menu</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-foreground px-5 py-2.5 text-xs uppercase tracking-[0.18em] text-background hover:bg-accent"
        >
          {showForm ? "Close" : "+ Add item"}
        </button>
      </div>
      {message && (
        <p
          className={`mb-4 text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
      {q.isError && (
        <p className="mb-4 text-sm text-red-600">
          {q.error instanceof Error ? q.error.message : "Could not load menu."}
        </p>
      )}
      {showForm && (
        <MenuItemForm
          nextOrder={active.length + 1}
          onCancel={() => setShowForm(false)}
          onCreate={async (row) => {
            await onSave(row);
            setShowForm(false);
          }}
        />
      )}
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!q.isLoading && active.length === 0 && (
        <p className="text-sm text-muted-foreground">No active products.</p>
      )}
      <div className="space-y-3">
        {active.map((item) => (
          <MenuRowEditor
            key={item.id}
            item={item}
            onSave={onSave}
            onDelete={async () => {
              if (!confirm(`Move "${item.name}" to trash?`)) return;
              try {
                await softDel({ data: { id: item.id } });
                await q.refetch();
                setMessage({ type: "success", text: "Product moved to trash." });
              } catch (err) {
                setMessage({
                  type: "error",
                  text: err instanceof Error ? err.message : "Could not delete product.",
                });
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

function MenuItemForm({
  nextOrder,
  onCreate,
  onCancel,
}: {
  nextOrder: number;
  onCreate: (row: Partial<MenuRow> & { name: string; price: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState(String(nextOrder));
  const [imageUrl, setImageUrl] = useState("");
  const [outOfStock, setOutOfStock] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const priceNum = Number(price);
    if (!name.trim()) return setError("Name is required.");
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setError("Price must be greater than zero.");
    if (imageUrl && !/^https?:\/\//i.test(imageUrl))
      return setError("Image URL must start with http:// or https://.");
    setSaving(true);
    try {
      await onCreate({
        name,
        description,
        price: priceNum,
        sort_order: Number(sort || 0),
        image_url: imageUrl || null,
        out_of_stock: outOfStock,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="mb-6 grid grid-cols-12 gap-3 rounded border border-border bg-card p-4"
    >
      <input
        className="col-span-12 md:col-span-3 border-b border-border bg-transparent py-1 text-sm outline-none"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="col-span-12 md:col-span-4 border-b border-border bg-transparent py-1 text-sm outline-none"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="col-span-6 md:col-span-1 border-b border-border bg-transparent py-1 text-sm outline-none"
        placeholder="Price *"
        inputMode="decimal"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <input
        className="col-span-6 md:col-span-1 border-b border-border bg-transparent py-1 text-sm outline-none"
        placeholder="Order"
        inputMode="numeric"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      />
      <input
        className="col-span-12 md:col-span-3 border-b border-border bg-transparent py-1 text-sm outline-none"
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <label className="col-span-12 flex items-center gap-2 text-xs uppercase tracking-[0.15em]">
        <input
          type="checkbox"
          checked={outOfStock}
          onChange={(e) => setOutOfStock(e.target.checked)}
        />
        No stock
      </label>
      {error && <p className="col-span-12 text-sm text-red-600">{error}</p>}
      <div className="col-span-12 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.15em]"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="rounded-full bg-foreground px-4 py-2 text-xs uppercase tracking-[0.15em] text-background disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save item"}
        </button>
      </div>
    </form>
  );
}

function MenuRowEditor({
  item,
  onSave,
  onDelete,
}: {
  item: MenuRow;
  onSave: (row: MenuRow) => Promise<unknown>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [priceStr, setPriceStr] = useState(String(item.price));
  const [sortStr, setSortStr] = useState(String(item.sort_order));
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [outOfStock, setOutOfStock] = useState(!!item.out_of_stock);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const priceNum = priceStr === "" || priceStr === "." ? Number.NaN : Number(priceStr);
  const sortNum = sortStr === "" ? 0 : Number(sortStr);
  const dirty =
    name !== item.name ||
    description !== item.description ||
    priceNum !== Number(item.price) ||
    sortNum !== Number(item.sort_order) ||
    imageUrl !== (item.image_url ?? "") ||
    outOfStock !== !!item.out_of_stock;

  const save = async () => {
    setError("");
    if (!name.trim()) return setError("Name is required.");
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setError("Price must be greater than zero.");
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      return setError("Image URL must start with http:// or https://.");
    }
    setSaving(true);
    try {
      await onSave({
        ...item,
        name,
        description,
        price: priceNum,
        sort_order: sortNum,
        image_url: imageUrl || null,
        out_of_stock: outOfStock,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-3 rounded border border-border p-4 items-start">
      <div className="col-span-12 md:col-span-2">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-20 w-20 rounded object-cover" />
        ) : (
          <div className="h-20 w-20 rounded border border-dashed border-border text-[10px] flex items-center justify-center text-muted-foreground">
            no image
          </div>
        )}
      </div>
      <div className="col-span-12 md:col-span-10 grid grid-cols-12 gap-3">
        <input
          className="col-span-12 md:col-span-4 border-b border-border bg-transparent py-1 text-sm focus:border-foreground outline-none"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="col-span-12 md:col-span-6 border-b border-border bg-transparent py-1 text-sm focus:border-foreground outline-none"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Price"
          className="col-span-6 md:col-span-1 border-b border-border bg-transparent py-1 text-sm focus:border-foreground outline-none"
          value={priceStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setPriceStr(v);
          }}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Order"
          className="col-span-6 md:col-span-1 border-b border-border bg-transparent py-1 text-sm focus:border-foreground outline-none"
          value={sortStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d+$/.test(v)) setSortStr(v);
          }}
        />
        <input
          type="url"
          placeholder="Image URL (https://…)"
          className="col-span-12 md:col-span-9 border-b border-border bg-transparent py-1 text-sm focus:border-foreground outline-none"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <label className="col-span-12 md:col-span-3 flex items-center gap-2 text-xs uppercase tracking-[0.15em]">
          <input
            type="checkbox"
            checked={outOfStock}
            onChange={(e) => setOutOfStock(e.target.checked)}
          />
          No stock
        </label>
        {error && <p className="col-span-12 text-sm text-red-600">{error}</p>}
        <div className="col-span-12 flex gap-2 justify-end">
          <button
            disabled={!dirty || saving}
            onClick={save}
            className="rounded-full bg-foreground px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-background disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onDelete}
            className="rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:border-foreground"
          >
            Trash
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────── Reservations ─────────────

type Reservation = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string;
  date: string;
  time: string;
  guests: number;
  note: string;
  status: "pending" | "approved" | "cancelled";
  deleted_at: string | null;
  created_at: string;
};

function ReservationsPanel() {
  const fetchAll = useServerFn(listReservations);
  const setStatus = useServerFn(setReservationStatus);
  const softDel = useServerFn(softDeleteReservation);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "cancelled">("all");
  const q = useQuery({
    queryKey: ["admin", "reservations"],
    queryFn: () => fetchAll({}) as Promise<Reservation[]>,
  });
  const active = (q.data ?? []).filter((r) => !r.deleted_at);
  const filtered = filter === "all" ? active : active.filter((r) => r.status === filter);

  const act = async (_id: string, fn: () => Promise<unknown>) => {
    await fn();
    q.refetch();
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <h2 className="font-display text-3xl">Reservations</h2>
        <div className="flex gap-2 text-xs">
          {(["all", "pending", "approved", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 uppercase tracking-[0.15em] border ${
                filter === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {filtered.length === 0 && !q.isLoading && (
        <p className="text-sm text-muted-foreground">No reservations.</p>
      )}
      <div className="space-y-3">
        {filtered.map((r) => (
          <article key={r.id} className="rounded border border-border p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-display text-lg">
                  {r.name} ·{" "}
                  <span className="text-muted-foreground">
                    {r.guests} {r.guests === 1 ? "guest" : "guests"}
                  </span>
                </p>
                {r.whatsapp && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">WhatsApp:</span>{" "}
                    <a
                      href={`https://wa.me/${r.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-accent underline-offset-2"
                    >
                      {r.whatsapp}
                    </a>
                  </p>
                )}
                {r.email && <p className="text-sm text-muted-foreground">{r.email}</p>}
                <p className="mt-1 text-sm">
                  {r.date} at {r.time.slice(0, 5)}
                </p>
                {r.note && <p className="mt-2 text-sm italic text-muted-foreground">"{r.note}"</p>}
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Submitted {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={r.status} />
                <div className="flex gap-2">
                  {r.status !== "approved" && (
                    <button
                      onClick={() =>
                        act(r.id, () => setStatus({ data: { id: r.id, status: "approved" } }))
                      }
                      className="rounded-full bg-foreground px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-background"
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== "cancelled" && (
                    <button
                      onClick={() =>
                        act(r.id, () => setStatus({ data: { id: r.id, status: "cancelled" } }))
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em]"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!confirm("Move to trash?")) return;
                      act(r.id, () => softDel({ data: { id: r.id } }));
                    }}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em]"
                  >
                    Trash
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: Reservation["status"] }) {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-stone-200 text-stone-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${map[status]}`}
    >
      {status}
    </span>
  );
}

// ───────────── Stats ─────────────

type ChartPoint = { label: string; value: number };

type AdminStats = {
  totalReservations: number;
  reservationsByDay: ChartPoint[];
  reservationsByWeek: ChartPoint[];
  reservationsByMonth: ChartPoint[];
  estimatedRevenue: number;
  topProducts: { label: string; count: number; estimatedRevenue: number }[];
  requestedHours: ChartPoint[];
  occupancyRate: number;
  reviewCount: number;
  averageRating: number;
  recentEvents: {
    id: string;
    event_type: string;
    target_label: string | null;
    created_at: string;
  }[];
};

function StatsPanel() {
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  const fetchStats = useServerFn(getAdminStats);
  const q = useQuery({
    queryKey: ["admin", "stats", range],
    queryFn: () => fetchStats({ data: { range } }) as Promise<AdminStats>,
  });
  const stats = q.data;

  return (
    <section>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <h2 className="font-display text-3xl">Statistics</h2>
        <div className="flex gap-2 text-xs">
          {(["24h", "7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 uppercase tracking-[0.15em] border ${range === r ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && (
        <p className="text-sm text-muted-foreground">Loading statistics from Supabase…</p>
      )}
      {q.isError && (
        <p className="text-sm text-red-600">
          {q.error instanceof Error ? q.error.message : "Could not load statistics."}
        </p>
      )}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            <StatCard label="Total reservations" value={stats.totalReservations} />
            <StatCard label="Estimated revenue" value={`$${stats.estimatedRevenue.toFixed(2)}`} />
            <StatCard label="Occupancy rate" value={`${stats.occupancyRate}%`} />
            <StatCard label="Reviews" value={stats.reviewCount} />
            <StatCard label="Average rating" value={stats.averageRating || "—"} />
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <BarList
              title="Reservations by day"
              data={stats.reservationsByDay}
              empty="No reservations in this range."
            />
            <BarList
              title="Reservations by week"
              data={stats.reservationsByWeek}
              empty="No weekly reservation data."
            />
            <BarList
              title="Reservations by month"
              data={stats.reservationsByMonth}
              empty="No monthly reservation data."
            />
            <BarList
              title="Most requested hours"
              data={stats.requestedHours}
              empty="No requested hours yet."
            />
            <div>
              <h3 className="font-display text-xl mb-3">Most reserved products</h3>
              {stats.topProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">No menu interactions recorded yet.</p>
              )}
              <ul className="space-y-2">
                {stats.topProducts.map((m) => (
                  <li
                    key={m.label}
                    className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
                  >
                    <span>{m.label}</span>
                    <span className="font-display">{m.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10">
            <h3 className="font-display text-xl mb-3">Recent analytics events</h3>
            {stats.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events in this range.</p>
            ) : (
              <table className="min-w-full text-sm">
                <tbody>
                  {stats.recentEvents.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{e.event_type}</td>
                      <td className="py-2 pr-4">{e.target_label ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function BarList({ title, data, empty }: { title: string; data: ChartPoint[]; empty: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <h3 className="font-display text-xl mb-3">{title}</h3>
      {data.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-28 truncate text-muted-foreground">{d.label}</span>
            <div className="h-3 flex-1 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right font-display">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

// ───────────── Reviews ─────────────

type ReviewRow = {
  id: string;
  customer_name: string;
  comment: string;
  rating: number;
  created_at: string;
};

function ReviewsPanel() {
  const fetchReviews = useServerFn(listReviewsAdmin);
  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => fetchReviews({}) as Promise<ReviewRow[]>,
  });
  const items = q.data ?? [];
  const avg = items.length
    ? items.reduce((sum, review) => sum + review.rating, 0) / items.length
    : 0;
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach((r) => dist[r.rating]++);

  return (
    <section>
      <h2 className="font-display text-3xl mb-6">Reviews</h2>
      {q.isLoading && (
        <p className="text-sm text-muted-foreground">Loading reviews from Supabase…</p>
      )}
      {q.isError && (
        <p className="text-sm text-red-600">
          {q.error instanceof Error ? q.error.message : "Could not load reviews."}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total reviews" value={items.length} />
        <StatCard label="Average rating" value={items.length ? avg.toFixed(2) : "—"} />
        <StatCard label="5-star reviews" value={dist[5]} />
      </div>
      <BarList
        title="Rating distribution"
        data={[5, 4, 3, 2, 1].map((s) => ({ label: `${s} ★`, value: dist[s] }))}
        empty="No reviews yet."
      />
      <h3 className="font-display text-xl mt-8 mb-3">Recent</h3>
      <ul className="space-y-2">
        {items.slice(0, 50).map((r) => (
          <li key={r.id} className="rounded border border-border px-3 py-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)} · {r.customer_name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">{r.comment}</p>
          </li>
        ))}
        {items.length === 0 && !q.isLoading && (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </ul>
    </section>
  );
}

// ───────────── Settings ─────────────

function SettingsPanel() {
  const q = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => (map[r.key] = r.value));
      return map;
    },
  });

  const [ig, setIg] = useState("");
  const [wa, setWa] = useState("");
  const [maps, setMaps] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) {
      setIg(q.data.instagram_url ?? "");
      setWa(q.data.whatsapp_url ?? "");
      setMaps(q.data.google_maps_url ?? "");
    }
  }, [q.data]);

  const save = async () => {
    setSaved(false);
    const rows = [
      { key: "instagram_url", value: ig },
      { key: "whatsapp_url", value: wa },
      { key: "google_maps_url", value: maps },
    ];
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    if (error) {
      alert(error.message);
      return;
    }
    setSaved(true);
    q.refetch();
  };

  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-3xl mb-6">Site settings</h2>
      <div className="space-y-5">
        <Setting
          label="Instagram URL"
          value={ig}
          onChange={setIg}
          placeholder="https://instagram.com/yourshop"
        />
        <Setting
          label="WhatsApp URL"
          value={wa}
          onChange={setWa}
          placeholder="https://wa.me/15551234567"
        />
        <Setting
          label="Google Maps review URL"
          value={maps}
          onChange={setMaps}
          placeholder="https://g.page/r/…/review"
        />
      </div>
      <button
        onClick={save}
        className="mt-8 rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.18em] text-background hover:bg-accent"
      >
        Save settings
      </button>
      {saved && <p className="mt-3 text-xs text-emerald-700">Saved.</p>}
    </section>
  );
}

function Setting({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-base outline-none focus:border-foreground"
      />
    </label>
  );
}

// ───────────── Trash ─────────────

function TrashPanel() {
  const fetchMenu = useServerFn(listAllMenu);
  const fetchRes = useServerFn(listReservations);
  const restoreM = useServerFn(restoreMenu);
  const hardM = useServerFn(hardDeleteMenu);
  const restoreR = useServerFn(restoreReservation);
  const hardR = useServerFn(hardDeleteReservation);

  const menuQ = useQuery({
    queryKey: ["admin", "menu"],
    queryFn: () => fetchMenu({}) as Promise<MenuRow[]>,
  });
  const resQ = useQuery({
    queryKey: ["admin", "reservations"],
    queryFn: () => fetchRes({}) as Promise<Reservation[]>,
  });

  const trashedMenu = (menuQ.data ?? []).filter((m) => m.deleted_at);
  const trashedRes = (resQ.data ?? []).filter((r) => r.deleted_at);

  return (
    <section className="grid gap-10 md:grid-cols-2">
      <div>
        <h2 className="font-display text-2xl mb-4">Menu trash</h2>
        {trashedMenu.length === 0 && <p className="text-sm text-muted-foreground">Empty.</p>}
        <div className="space-y-3">
          {trashedMenu.map((m) => (
            <div key={m.id} className="rounded border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {m.name} — ${Number(m.price).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await restoreM({ data: { id: m.id } });
                      menuQ.refetch();
                    }}
                    className="rounded-full bg-foreground px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-background"
                  >
                    Restore
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Permanently delete?")) return;
                      await hardM({ data: { id: m.id } });
                      menuQ.refetch();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.15em]"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl mb-4">Reservation trash</h2>
        {trashedRes.length === 0 && <p className="text-sm text-muted-foreground">Empty.</p>}
        <div className="space-y-3">
          {trashedRes.map((r) => (
            <div key={r.id} className="rounded border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.name} · {r.guests}p
                  </p>
                  <p className="text-xs text-muted-foreground">{r.whatsapp || r.email}</p>
                  <p className="text-xs">
                    {r.date} {r.time.slice(0, 5)} · {r.status}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await restoreR({ data: { id: r.id } });
                      resQ.refetch();
                    }}
                    className="rounded-full bg-foreground px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-background"
                  >
                    Restore
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Permanently delete?")) return;
                      await hardR({ data: { id: r.id } });
                      resQ.refetch();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.15em]"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
