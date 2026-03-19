import { Link, useLocation, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Coffee } from "lucide-react";

const navItems = [
  { label: "Waiter", path: "/waiter/orders" },
  { label: "Cashier", path: "/cashier" },
  { label: "Barista", path: "/barista" },
];

export function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/waiter/orders") {
      return location.pathname.startsWith("/waiter");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-6 flex items-center space-x-2">
            <Coffee className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="font-heading font-bold text-lg tracking-tight">
              Coffeeshop
            </span>
          </div>
          <nav aria-label="Main navigation" className="flex items-center space-x-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
