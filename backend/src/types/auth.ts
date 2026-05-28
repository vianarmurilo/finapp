export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  iat?: number;
  exp?: number;
}
