import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { UserTable } from "@/components/users/user-table";

import { requireAdmin } from "@/lib/authz";
async function getUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    ;
}

export default async function UsersPage() {
  await requireAdmin();
  const userList = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
        <p className="text-muted-foreground">
          Kelola pengguna dan hak akses.
        </p>
      </div>
      <UserTable users={userList} />
    </div>
  );
}
