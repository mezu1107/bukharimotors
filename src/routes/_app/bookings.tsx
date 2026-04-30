import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/bookings")({ component: () => <Stub title="Bookings" desc="Rental agreements list, filters, status workflow." /> });

function Stub({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">{desc}</p></div>
      <Card className="glass-strong border-0 p-12 text-center">
        <div className="text-lg font-semibold mb-1">Module scaffold ready</div>
        <p className="text-sm text-muted-foreground">Database table, RLS, and route are wired. Ask me to build out the full UI for this module next.</p>
      </Card>
    </div>
  );
}
