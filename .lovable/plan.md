# Admin Panel for Coffee Stay

Add a backend-powered admin area at `/admin` that manages the public landing page's menu and reservations, with a trash/history for soft-deleted items.

## 1. Enable Lovable Cloud
Provisions database + auth so menu and reservations live server-side (currently menu is hardcoded and reservations only go to localStorage).

## 2. Database
Three tables, all with `deleted_at timestamptz` for soft delete:

- **`menu_items`** — `id`, `name`, `price` (numeric), `description`, `sort_order`, `deleted_at`, timestamps. Seed with the 6 existing items.
- **`reservations`** — `id`, `name`, `email`, `date`, `time`, `guests` (int), `note`, `status` ('pending' | 'approved' | 'cancelled'), `deleted_at`, timestamps.
- **`user_roles`** + `app_role` enum (`admin`, `user`) + `has_role()` security-definer function (per platform rule, roles never live on profile tables).

RLS:
- `menu_items`: public `SELECT` where `deleted_at IS NULL`; admin-only insert/update/delete.
- `reservations`: public `INSERT` (anyone can book); admin-only select/update/delete.
- `user_roles`: only admins can read/write; `has_role` is security-definer.

## 3. Seed admin user
Migration creates auth user `d3mo@gmail.com` / `pass123` and grants `admin` role.

> Note: this is a demo credential committed in plain text — fine for a demo, but anyone reading the project knows the password. Mentioning so you're aware.

## 4. Public landing page changes (`src/routes/index.tsx`)
- Menu section: fetch live `menu_items` (ordered by `sort_order`) via a public server function instead of the hardcoded array.
- Reservation form: submit to a public server function that inserts into `reservations` with status `pending` (replaces the localStorage write).

## 5. Auth route (`/auth`)
Minimal email+password sign-in screen. On success, redirect to `/admin`. No sign-up UI (single seeded admin).

## 6. Admin route (`/_authenticated/admin`)
Gated by the integration-managed `_authenticated` layout plus an admin role check (non-admins redirected to `/`). Three tabs:

- **Menu** — list active items, inline edit name/price/description/order, add new, soft-delete (sets `deleted_at`). Live-reflects on landing page.
- **Reservations** — list active reservations with filter by status; buttons to Approve, Cancel, or soft-delete. Shows all submitted info.
- **Trash / History** — lists soft-deleted menu items and reservations side-by-side with Restore and Permanently delete actions. Acts as the change/action history.

Sign-out button in the admin header.

## Technical notes
- Server functions live in `src/lib/menu.functions.ts`, `src/lib/reservations.functions.ts`, `src/lib/admin.functions.ts`. Admin mutations use `requireSupabaseAuth` + `has_role` check; public reads use the server publishable client.
- Real-time isn't required — admin actions show immediately in admin UI; landing page refetches on mount.
- No edits to design tokens, fonts, or visual styling of the existing landing page.

## Out of scope
- Email notifications on reservation approval.
- Multi-admin management UI (only the seeded admin exists; more can be added later via SQL).
- Hard audit log beyond the trash view.