import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const rangeInput = z.object({ range: z.enum(["24h", "7d", "30d", "all"]).default("7d") });

function rangeSince(r: "24h" | "7d" | "30d" | "all"): string | null {
  if (r === "all") return null;
  const ms = r === "24h" ? 86400e3 : r === "7d" ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(Date.now() - ms).toISOString();
}

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function weekKey(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const since = rangeSince(data.range);

    let reservationsQuery = context.supabase
      .from("reservations")
      .select("id, created_at, date, time, guests, status, deleted_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    let reviewsQuery = context.supabase
      .from("reviews")
      .select("id, rating, created_at")
      .order("created_at", { ascending: false });
    let eventsQuery = context.supabase
      .from("analytics_events")
      .select("id, event_type, target_id, target_label, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    const { data: menuItems, error: menuError } = await context.supabase
      .from("menu_items")
      .select("id, name, price, deleted_at");

    if (since) {
      reservationsQuery = reservationsQuery.gte("created_at", since);
      reviewsQuery = reviewsQuery.gte("created_at", since);
      eventsQuery = eventsQuery.gte("created_at", since);
    }

    const [reservationsRes, reviewsRes, eventsRes] = await Promise.all([
      reservationsQuery,
      reviewsQuery,
      eventsQuery,
    ]);
    if (reservationsRes.error) throw new Error(reservationsRes.error.message);
    if (reviewsRes.error) throw new Error(reviewsRes.error.message);
    if (eventsRes.error) throw new Error(eventsRes.error.message);
    if (menuError) throw new Error(menuError.message);

    const reservations = reservationsRes.data ?? [];
    const reviews = reviewsRes.data ?? [];
    const events = eventsRes.data ?? [];
    const activeReservations = reservations.filter((r) => r.status !== "cancelled");
    const menuById = new Map((menuItems ?? []).map((m) => [m.id, m]));
    const avgMenuPrice = (menuItems ?? []).length
      ? (menuItems ?? []).reduce((s, m) => s + Number(m.price ?? 0), 0) / (menuItems ?? []).length
      : 0;

    const byDay: Record<string, number> = {};
    const byWeek: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    for (const r of reservations) {
      byDay[r.date] = (byDay[r.date] ?? 0) + 1;
      byWeek[weekKey(r.date)] = (byWeek[weekKey(r.date)] ?? 0) + 1;
      byMonth[r.date.slice(0, 7)] = (byMonth[r.date.slice(0, 7)] ?? 0) + 1;
      const hour = String(r.time).slice(0, 5);
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }

    const productHits: Record<string, { label: string; count: number; estimatedRevenue: number }> =
      {};
    for (const e of events) {
      if (e.event_type !== "click_menu_item") continue;
      const item = e.target_id ? menuById.get(e.target_id) : null;
      const key = e.target_id ?? e.target_label ?? "unknown";
      if (!productHits[key])
        productHits[key] = {
          label: item?.name ?? e.target_label ?? "Unknown",
          count: 0,
          estimatedRevenue: 0,
        };
      productHits[key].count += 1;
      productHits[key].estimatedRevenue += Number(item?.price ?? 0);
    }

    const averageRating = reviews.length
      ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length
      : 0;
    const uniqueReservationDays = new Set(reservations.map((r) => r.date)).size || 1;
    const slotCapacity = uniqueReservationDays * 20;

    return {
      range: data.range,
      totalReservations: reservations.length,
      reservationsByDay: Object.entries(byDay).map(([label, value]) => ({ label, value })),
      reservationsByWeek: Object.entries(byWeek).map(([label, value]) => ({ label, value })),
      reservationsByMonth: Object.entries(byMonth).map(([label, value]) => ({ label, value })),
      estimatedRevenue: Number((activeReservations.length * avgMenuPrice).toFixed(2)),
      topProducts: Object.values(productHits)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      requestedHours: Object.entries(byHour)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label))),
      occupancyRate: Number(
        Math.min(100, (activeReservations.length / slotCapacity) * 100).toFixed(1),
      ),
      reviewCount: reviews.length,
      averageRating: Number(averageRating.toFixed(2)),
      recentEvents: events.slice(0, 50),
    };
  });
