import AdminShell from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Triple E Organization Quiz Portal",
  description: "Secure management console for Triple E Organization 2nd Quiz Competition results, Google Sheets sync, and branding.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
