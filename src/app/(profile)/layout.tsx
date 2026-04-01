import type { ReactNode } from "react";

interface ProfileLayoutProps {
  children: ReactNode;
}

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  return <>{children}</>;
}
