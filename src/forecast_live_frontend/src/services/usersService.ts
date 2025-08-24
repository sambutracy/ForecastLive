import { ActorSubclass } from "@dfinity/agent";
import { _SERVICE as UsersService } from "../declarations/users/users.did";
import { User, Result } from "../types/users";
import { Principal } from "@dfinity/principal";

export class UsersAPI {
  private actor: ActorSubclass<UsersService>;

  constructor(actor: ActorSubclass<UsersService>) {
    this.actor = actor;
  }

  async createUser(displayName: string, avatarUrl: string | null, authType: string): Promise<Result<User>> {
    const result = await this.actor.createUser(displayName, avatarUrl ? [avatarUrl] : [], authType);
    if ("ok" in result) {
      const cu = result.ok;
      const mapped: User = {
        principal: cu.principal?.toText ? cu.principal.toText() : String(cu.principal),
        displayName: cu.displayName,
        avatarUrl: Array.isArray(cu.avatarUrl) && cu.avatarUrl.length > 0 ? cu.avatarUrl[0] : null,
        authType: cu.authType,
        createdAt: Number(cu.createdAt ?? Number(0)),
        groupsCreated: cu.groupsCreated ?? [],
        groupsJoined: cu.groupsJoined ?? [],
      };

      return { ok: mapped };
    }

    return { err: (result as any).err ?? 'Unknown error' };
  }

  async getUser(principal: string): Promise<User | null> {
    try {
      const p = Principal.fromText(principal);
      const result = await this.actor.getUser(p);
      if (Array.isArray(result) && result.length > 0) {
        const cu = result[0];
        if (!cu) {
          return null;
        }
        const mapped: User = {
          principal: cu.principal?.toText ? cu.principal.toText() : String(cu.principal),
          displayName: cu.displayName,
          avatarUrl: Array.isArray(cu.avatarUrl) && cu.avatarUrl.length > 0 ? cu.avatarUrl[0] : null,
          authType: cu.authType,
          createdAt: Number(cu.createdAt ?? 0),
          groupsCreated: cu.groupsCreated ?? [],
          groupsJoined: cu.groupsJoined ?? [],
        };
        return mapped;
      }
      return null;
    } catch (e) {
      // invalid principal text or actor error
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const res = await this.actor.getAllUsers();
    return (res || []).map((cu: any) => ({
      principal: cu.principal?.toText ? cu.principal.toText() : String(cu.principal),
      displayName: cu.displayName,
      avatarUrl: Array.isArray(cu.avatarUrl) && cu.avatarUrl.length > 0 ? cu.avatarUrl[0] : null,
      authType: cu.authType,
      createdAt: Number(cu.createdAt ?? 0),
      groupsCreated: cu.groupsCreated ?? [],
      groupsJoined: cu.groupsJoined ?? [],
    }));
  }

  async searchUsers(term: string): Promise<User[]> {
    const res = await this.actor.searchUsers(term);
    return (res || []).map((cu: any) => ({
      principal: cu.principal?.toText ? cu.principal.toText() : String(cu.principal),
      displayName: cu.displayName,
      avatarUrl: Array.isArray(cu.avatarUrl) && cu.avatarUrl.length > 0 ? cu.avatarUrl[0] : null,
      authType: cu.authType,
      createdAt: Number(cu.createdAt ?? 0),
      groupsCreated: cu.groupsCreated ?? [],
      groupsJoined: cu.groupsJoined ?? [],
    }));
  }

  async updateUser(displayName?: string, avatarUrl?: string): Promise<Result<User>> {
    const nameArg: [] | [string] = displayName !== undefined ? [displayName] : [];
    const avatarArg: [] | [string] = avatarUrl !== undefined ? [avatarUrl] : [];
    const result = await this.actor.updateUser(nameArg, avatarArg);
    if ("ok" in result) {
      const cu = result.ok;
      const mapped: User = {
        principal: cu.principal?.toText ? cu.principal.toText() : String(cu.principal),
        displayName: cu.displayName,
        avatarUrl: Array.isArray(cu.avatarUrl) && cu.avatarUrl.length > 0 ? cu.avatarUrl[0] : null,
        authType: cu.authType,
        createdAt: Number(cu.createdAt ?? 0),
        groupsCreated: cu.groupsCreated ?? [],
        groupsJoined: cu.groupsJoined ?? [],
      };
      return { ok: mapped };
    }
    return { err: (result as any).err ?? 'Unknown error' };
  }

  async deleteUser(): Promise<Result<null>> {
    return await this.actor.deleteUser();
  }

  async addGroupCreated(groupId: string): Promise<Result<null>> {
    return await this.actor.addGroupCreated(groupId);
  }

  async addGroupJoined(groupId: string): Promise<Result<null>> {
    return await this.actor.addGroupJoined(groupId);
  }

  async getGroups(principal: string): Promise<string[]> {
    try {
      const p = Principal.fromText(principal);
      return await this.actor.getGroups(p);
    } catch (e) {
      return [];
    }
  }
}