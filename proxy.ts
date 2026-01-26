import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import rbac from "@/config/rbac.json";
import { hasEnvVars } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
type UserRoleRow = { roles?: { name?: string } };

function isPublicPath(pathname: string): boolean {
  return rbac.publicPaths.some((p: string) => pathname.startsWith(p));
}

async function getRole(
  request: NextRequest,
  response: NextResponse,
): Promise<"admin" | "sub_admin" | "teacher" | "student" | "anonymous"> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  if (!uid) return "anonymous";
  const { data: usr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();
  const userId = (usr?.id as number | undefined) ?? undefined;
  if (userId) {
    const { data: urs } = await supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", userId);
    const names = (urs ?? [])
      .map((r) => (r as UserRoleRow)?.roles?.name as string | undefined)
      .filter(Boolean);
    if (names.includes("admin")) return "admin";
    if (names.includes("sub_admin")) return "sub_admin";
    if (names.includes("teacher")) return "teacher";
  }
  const { data: stu } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (stu?.id) return "student";
  return "anonymous";
}

async function logAccess(
  info: {
    authUserId: string | null;
    role: string;
    path: string;
    method: string;
    outcome: "allowed" | "redirected" | "denied";
  },
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("access_logs").insert({
      auth_user_id: info.authUserId,
      role: info.role,
      path: info.path,
      method: info.method,
      outcome: info.outcome,
    });
  } catch {
  }
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  if (!hasEnvVars) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  if (pathname === "/") {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user ?? null;

  if (!user && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const red = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => red.cookies.set(c));
    await logAccess({
      authUserId: null,
      role: "anonymous",
      path: pathname,
      method: request.method,
      outcome: "redirected",
    });
    return red;
  }

  const role = await getRole(request, response);
  const effectiveRole =
    (role === "anonymous" ? (rbac.defaultRole as "admin" | "sub_admin" | "teacher" | "student") : role);
  const roleHome = rbac.roles[effectiveRole].home;

  let outcome: "allowed" | "redirected" | "denied" = "allowed";
  let dest: string | null = null;

  if (user) {
    if (pathname.startsWith("/auth/login")) {
      dest = roleHome;
    } else if (pathname.startsWith("/admin") && role !== "admin") {
      dest = roleHome;
    } else if (pathname.startsWith("/teacher") && role !== "teacher") {
      dest = roleHome;
    } else if (pathname.startsWith("/sub_admin") && role !== "sub_admin") {
      dest = roleHome;
    }
  }

  if (dest && dest !== pathname) {
    outcome = "redirected";
    const url = request.nextUrl.clone();
    url.pathname = dest;
    const red = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => red.cookies.set(c));
    const { data: u } = await supabase.auth.getUser();
    await logAccess({
      authUserId: u.user?.id ?? null,
      role,
      path: pathname,
      method: request.method,
      outcome,
    });
    return red;
  }

  Promise.resolve().then(async () => {
    const { data: u } = await supabase.auth.getUser();
    await logAccess({
      authUserId: u.user?.id ?? null,
      role,
      path: pathname,
      method: request.method,
      outcome,
    });
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
