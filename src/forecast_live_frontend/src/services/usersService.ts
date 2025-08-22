import { ActorSubclass } from "@dfinity/agent";
import { _SERVICE as UsersService } from "../declarations/users/users.did";
import { User, Result } from "../types/users";

export class UsersAPI {
  private actor: ActorSubclass<UsersService>;

  constructor(actor: ActorSubclass<UsersService>) {
    this.actor = actor;
  }

  async createUser(displayName: string, avatarUrl: string | null, authType: string): Promise<Result<User>> {
    return await this.actor.createUser(displayName, avatarUrl ? [avatarUrl] : [], authType);
  }

  async getUser(principal: string): Promise<User | null> {
    return await this.actor.getUser(principal);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.actor.getAllUsers();
  }

  async searchUsers(term: string): Promise<User[]> {
    return await this.actor.searchUsers(term);
  }

  async updateUser(displayName?: string, avatarUrl?: string): Promise<Result<User>> {
    const nameArg = displayName ? [displayName] : [];
    const avatarArg = avatarUrl ? [avatarUrl] : [];
    return await this.actor.updateUser(nameArg, avatarArg);
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
    return await this.actor.getGroups(principal);
  }
}