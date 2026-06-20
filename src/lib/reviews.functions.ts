import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

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

const reviewInput = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(120),
  comment: z.string().trim().min(1, "Comment is required").max(1000),
  rating: z.number().int().min(1).max(5),
});

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: inserted, error } = await supabase
      .from("reviews")
      .insert({
        customer_name: data.customer_name,
        comment: data.comment,
        rating: data.rating,
      })
      .select("id, customer_name, comment, rating, created_at")
      .single();

    if (error) throw new Error(error.message || "Could not save the review.");
    return inserted;
  });

export const listPublicReviews = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, customer_name, comment, rating, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reviews")
      .select("id, customer_name, comment, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
