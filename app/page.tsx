import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  try {
    const supa = await createClient();
    const { data: claims } = await supa.auth.getClaims();
    const hasUser = !!claims?.claims;
    if (!hasUser) {
      redirect("/auth/login");
    }
    const { data: u } = await supa.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      redirect("/auth/login");
    }
    const { data: usr } = await supa.from("users").select("id").eq("auth_user_id", uid).maybeSingle();
    const userId = (usr?.id as number | undefined) ?? undefined;
    if (!userId) {
      redirect("/auth/login");
    }
    const { data: rolesRows } = await supa
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", userId);
    const roleNames = (rolesRows ?? [])
      .map((r) => (r as { roles?: { name?: string } })?.roles?.name)
      .filter(Boolean);
    if (roleNames.includes("admin")) {
      redirect("/admin");
    }
    if (roleNames.includes("teacher")) {
      redirect("/teacher");
    }
    redirect("/auth/login");
  } catch {
    redirect("/auth/login");
  }
  return null;
}
