import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string | null;
    isSuperAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string | null;
      isSuperAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string | null;
    isSuperAdmin?: boolean;
  }
}
