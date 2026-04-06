export interface User {
  id: string;
  name?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AuthModalMode = "login" | "register" | "forgot";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginData {
  user: User;
}

export interface RegisterPayload {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterData {
  user: User;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  password: string;
  confirmPassword?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarFile?: File | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ValidateSessionData {
  valid: boolean;
  user?: User | null;
}
