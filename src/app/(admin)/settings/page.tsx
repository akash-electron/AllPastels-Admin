import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckoutSettingsForm } from "@/components/settings/CheckoutSettingsForm";
import { InventorySettingsForm } from "@/components/settings/InventorySettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage checkout pricing and inventory alert rules."
      />
      <div className="flex flex-col gap-6">
        <CheckoutSettingsForm />
        <InventorySettingsForm />
      </div>
    </>
  );
}
