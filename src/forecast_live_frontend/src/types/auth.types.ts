import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';

export type AuthType = 'nfid' | 'ii' | 'email' | null;

export interface UserData {
  principal: Principal;
  principalText: string;
  username?: string;
  email?: string;
  authType: AuthType;
  role?: 'user' | 'admin';
  isDevelopmentUser?: boolean;
  // Optional profile fields returned by Users canister
  displayName?: string;
  avatarUrl?: string | null;
  createdAt?: number;
  groupsCreated?: string[];
  groupsJoined?: string[];
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  identity: Identity | Principal | null;
  loading: boolean;
  authType: AuthType;
  authError: string | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  loginWithNFID: () => Promise<boolean>;
  loginWithInternetIdentity: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export interface LoginResult {
  success: {
    user: {
      principal: Principal | string;
      email: string;
      username: string;
    };
    token: string;
  };
  error?: string;
}

export interface RegisterResult {
  ok: {
    principal: Principal | string;
    email: string;
    username: string;
  };
  err?: string;
}