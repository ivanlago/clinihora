import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { usersToClinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

import DashboardSignOut from "./_components/dashboard-signout";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/authentication");
  }

  const clinics = await db.query.usersToClinicsTable.findMany({
    where: eq(usersToClinicsTable.userId, session.user.id),
  });
  if (clinics.length === 0) {
    redirect("/add-clinic");
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <h1>{session?.user?.email}</h1>
      <h1>{session?.user?.name}</h1>
      <Image
        src={session?.user?.image || "/no-image.png"}
        alt={session?.user?.name || ""}
        width={50}
        height={50}
        priority
      />
      <DashboardSignOut />
    </div>
  );
}
