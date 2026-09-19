export type UserRole = "CONSUMER" | "MANUFACTURER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}
