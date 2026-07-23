import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/mock-auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: getSession() ? "/dashboard" : "/login" });
  },
  component: () => null,
});
