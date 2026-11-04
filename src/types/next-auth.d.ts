import type { DefaultSession } from "next-auth";

// `role` ikut di token JWT dan sesi, jadi route maupun halaman tidak perlu
// query ulang ke database untuk mengetahui peran pengguna.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
