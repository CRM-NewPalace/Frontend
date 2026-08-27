import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/imoveis")({
  ssr: false,
  component: () => <Outlet />,
});
