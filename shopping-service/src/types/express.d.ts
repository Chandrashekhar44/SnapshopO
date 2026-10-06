declare global {
  namespace Express {
    interface Request {
      user: {
        id: number;
        username: string;
        email: string;
        role: string;
        latitude: number | null;
        longitude: number | null;
      };
    }
  }
}

export {};