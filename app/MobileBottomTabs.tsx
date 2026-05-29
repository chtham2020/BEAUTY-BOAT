import { Home, ReceiptText, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";

type MobileBottomTabsProps = {
  active: "home" | "products" | "cart" | "checkout";
};

const tabs = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "products", href: "/products", label: "Order", icon: ShoppingBag },
  { id: "cart", href: "/cart", label: "Cart", icon: ShoppingCart },
  { id: "checkout", href: "/checkout", label: "Pay", icon: ReceiptText },
] as const;

export function MobileBottomTabs({ active }: MobileBottomTabsProps) {
  return (
    <nav className="mobile-bottom-tabs" aria-label="Mobile customer navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <Link className={isActive ? "is-active" : ""} href={tab.href} key={tab.id} aria-current={isActive ? "page" : undefined}>
            <Icon size={19} aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
