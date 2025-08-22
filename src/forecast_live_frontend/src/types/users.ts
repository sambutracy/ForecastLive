export interface User {
  principal: string;
  displayName: string;
  avatarUrl?: string | null;
  authType: string;
  createdAt: number;
  groupsCreated: string[];
  groupsJoined: string[];
}

export type Result<T> = { ok: T } | { err: string };
