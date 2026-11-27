export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Inventory", href: "/inventory" },
  { label: "Orders", href: "/orders" },
  { label: "Messages", href: "/messages" },
  { label: "Coupons", href: "/coupons" },
  { label: "Reviews", href: "/reviews" },
  { label: "Settings", href: "/settings" },
] as const;

export type NavItem = (typeof navItems)[number];
