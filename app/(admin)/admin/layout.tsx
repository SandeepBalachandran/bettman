import { AdminNav } from "@/components/features/admin/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6 p-2 sm:p-4">
      <AdminNav />
      {children}
    </main>
  );
}
