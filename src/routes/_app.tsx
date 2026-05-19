import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app")({
  component: ProtectedApp,
});

function ProtectedApp() {
  const { loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AppLayout />;
}
