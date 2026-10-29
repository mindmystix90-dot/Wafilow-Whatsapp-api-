import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      organizationId?: string | null;
      sessionVersion?: number;
      status?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    organizationId?: string | null;
    sessionVersion?: number;
    status?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    organizationId?: string | null;
    picture?: string | null;
    sessionVersion?: number;
    status?: string;
    revoked?: boolean;
  }
}
