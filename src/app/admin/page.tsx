import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { toPublicUserDTO, displayNameFor } from "@/lib/dto";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Пользователи, каталог, коллекции и поддержка KAPS.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireAdmin();
  const publicUser = toPublicUserDTO(user);

  return (
    <AdminConsole
      me={{
        id: user.id,
        displayName: displayNameFor(user),
        role: publicUser.role,
        isDemo: user.isDemo,
      }}
    />
  );
}
