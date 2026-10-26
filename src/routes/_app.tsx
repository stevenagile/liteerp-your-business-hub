import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: ProtectedApp,
});

function ProtectedApp() {
  const { loading, session, error, retryAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session && !error) {
      navigate({ to: "/login" });
    }
  }, [loading, session, error, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">LiteERP · 無法讀取登入資料</h1>
        <p className="max-w-md text-sm text-destructive">{error}</p>
        <Button onClick={retryAuth}>重試</Button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AppLayout />;
}
