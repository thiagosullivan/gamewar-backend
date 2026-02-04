declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        image?: string | undefined;
        phone?: string | undefined;
        emailVerified: boolean;
        role: string;
      };
    }
  }
}

export {};
