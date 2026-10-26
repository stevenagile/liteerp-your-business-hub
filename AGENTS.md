# Architecture rules

- Use the canonical Supabase client from `@/lib/supabase` for all browser authentication and reads to avoid competing session clients.
- Auth event callbacks only update React state; read profiles in a separate effect with cancellation and bounded waits to avoid Supabase auth-lock deadlocks and permanent loading screens.
- Extend generated public database types with explicit page contracts for external schemas, keeping schema names typed instead of casting them to never.