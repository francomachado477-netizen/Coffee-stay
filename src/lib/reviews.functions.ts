import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const reviewInput = z.object({
  rating: z.number().int().min(1).max(5),
});

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { error } = await supabase.from("reviews").insert({
      rating: data.rating,
    });
    
    if (error) {
      throw new Error("Could not save the review.");
    }
    
    return { ok: true };
  });
