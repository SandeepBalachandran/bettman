import { AdminNav } from "@/components/features/admin/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <AdminNav />
      {children}
    </main>
  );
}
