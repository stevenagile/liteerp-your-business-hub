import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "登入 · LiteERP 進銷存" },
    { name: "description", content: "登入 LiteERP 進銷存管理系統。" },
    { property: "og:title", content: "登入 · LiteERP 進銷存" },
    { property: "og:description", content: "登入 LiteERP，管理企業進銷存。" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, error: authError, retryAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && !authError) {
      navigate({ to: "/" });
    }
  }, [loading, session, authError, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid_credentials")) {
        setError("帳號或密碼錯誤,請重新輸入");
      } else if (msg.includes("email not confirmed")) {
        setError("此帳號尚未完成 Email 驗證");
      } else {
        setError(error.message);
      }
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success text-xl font-bold text-success-foreground shadow-sm">
            L
          </div>
          <h1 className="mt-3 text-xl font-semibold">LiteERP</h1>
          <p className="text-xs text-muted-foreground">進銷存管理系統</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {(error || authError) && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error || authError}</span>
            </div>
          )}
          {authError && <Button type="button" variant="outline" onClick={retryAuth} className="w-full">重試登入檢查</Button>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登入
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LiteERP
        </p>
      </div>
    </div>
  );
}
