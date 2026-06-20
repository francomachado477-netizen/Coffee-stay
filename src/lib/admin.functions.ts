import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Verifies the admin password against the server-side ADMIN_PASSWORD secret
 * using constant-time comparison, then ensures the admin auth user exists
 * (with its Supabase password kept in sync with the secret) and has the
 * admin role. Returns the admin email so the client can complete
 * `signInWithPassword`.
 *
 * Never exposes the secret. Never accepts an email from the client.
 */
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (!input || typeof input.password !== "string") {
      throw new Error("Password required");
    }
    
    // CORRECCIÓN DE SEGURIDAD: Límite de caracteres para evitar saturación de memoria (DoS)
    if (input.password.length > 100) {
      throw new Error("Password is too long");
    }
    
    return { password: input.password };
  })
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("Admin login is not configured");

    // Constant-time comparison
    const a = new TextEncoder().encode(data.password);
    const b = new TextEncoder().encode(expected);
    let diff = a.length ^ b.length;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    if (diff !== 0) {
      // Generic message — don't reveal whether config or password is wrong
      throw new Error("Invalid credentials");
    }

    const email = process.env.ADMIN_EMAIL ?? "admin@coffeestay.local";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find or create the admin auth user. Keep its Supabase password in sync
    // with ADMIN_PASSWORD so the client can immediately signInWithPassword.
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error("Login unavailable");
    let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: expected,
        email_confirm: true,
      });
      if (createErr) throw new Error("Login unavailable");
      user = created.user ?? undefined;
    } else {
      // Ensure stored password matches the current secret (rotates with it).
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: expected,
      });
      if (updErr) throw new Error("Login unavailable");
    }

    if (!user) throw new Error("Login unavailable");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error("Login unavailable");

    return { email };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
  });
