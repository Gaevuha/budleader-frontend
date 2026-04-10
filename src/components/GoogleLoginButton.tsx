"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/UI/Button/Button";
import { AUTH_API_URL } from "@/services/api";

interface GoogleLoginButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function GoogleLoginButton({
  children = "Login with Google",
  onClick,
  type = "button",
  ...props
}: GoogleLoginButtonProps) {
  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"] = (
    event
  ) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    window.location.href = `${AUTH_API_URL}/google`;
  };

  return (
    <Button type={type} onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}
