"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useLogout } from "@/queries/authQueries";

interface LogoutButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  redirectTo?: string;
}

export function LogoutButton({
  children = "Logout",
  onClick,
  redirectTo = "/",
  type = "button",
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] =
    async (event) => {
      onClick?.(event);

      if (event.defaultPrevented || logoutMutation.isPending) {
        return;
      }

      await logoutMutation.mutateAsync();
      router.push(redirectTo);
      router.refresh();
    };

  return (
    <button type={type} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
