import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/bounties")({
  component: BountiesLayout,
});

function BountiesLayout() {
  return <Outlet />;
}
