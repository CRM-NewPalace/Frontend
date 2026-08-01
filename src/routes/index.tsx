import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/permissions";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    const user = getSession();
    throw redirect({
      to: user ? defaultRouteForRole(user.role) : "/login",
    });
  },
  component: () => null,
});
