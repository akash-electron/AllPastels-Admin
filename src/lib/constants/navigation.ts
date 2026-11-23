export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/orders" },
  { label: "Messages", href: "/messages" },
  { label: "Coupons", href: "/coupons" },
  { label: "Settings", href: "/settings" },
] as const;

export type NavItem = (typeof navItems)[number];
