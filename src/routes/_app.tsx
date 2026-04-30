import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Car, Users, UserCog, CalendarDays, Wrench, FileText,
  Bell, Settings2, BarChart3, Gift, ClipboardCheck, Receipt, Menu, X,
  LogOut, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: FileText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/vehicles", label: "Vehicles", icon: Car },
  { to: "/drivers", label: "Drivers", icon: UserCog },
  { to: "/payments", label: "Payments", icon: Receipt },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/inspections", label: "Inspections", icon: ClipboardCheck },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/promotions", label: "Loyalty & Promos", icon: Gift },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/templates", label: "Form Templates", icon: Settings2 },
] as const;

function AppShell() {
  const { user, loading, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Close drawer on navigation
  useEffect(() => { setOpen(false); }, [path]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const Sidebar = (
    <aside className="h-full w-72 flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-5 border-b border-sidebar-border flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
          <Car className="size-5 text-gold-foreground" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-gold-gradient">BUKHARI MOTORS</div>
          <div className="text-[10px] text-sidebar-foreground/60">& Rent A Car</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => {
          const active = path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elegant"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="ml-auto size-1.5 rounded-full bg-sidebar-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-xs font-medium truncate">{user.email}</div>
          <div className="text-[10px] text-sidebar-foreground/60 capitalize">
            {roles.length ? roles.join(", ") : "no role"}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
        >
          <LogOut className="size-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">{Sidebar}</div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {Sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass-strong border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Bukhari Motors</div>
            <div className="text-sm font-semibold truncate capitalize">
              {path.split("/").filter(Boolean).slice(-1)[0] ?? "Dashboard"}
            </div>
          </div>
          <Link to="/bookings/new">
            <Button size="sm" className="bg-gradient-primary shadow-elegant">
              <FileText className="size-4 mr-1.5" /> New Booking
            </Button>
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Hidden close button reference */}
      <span className="hidden">
        <X />
      </span>
    </div>
  );
}
