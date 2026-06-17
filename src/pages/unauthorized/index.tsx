import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="size-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Access denied</h1>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to view this page. If you think this is a
        mistake, contact your administrator.
      </p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
