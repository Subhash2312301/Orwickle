export interface AuthenticatedUser {
  id: string;
  role: 'student' | 'investor' | 'buyer' | 'admin';
  email: string;
  sid: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
