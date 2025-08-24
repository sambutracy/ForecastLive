import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Result = { 'ok': User } | { 'err': string };
export type Result_1 = { 'ok': null } | { 'err': string };
export type Timestamp = bigint;

export interface User {
  principal: Principal;
  groupsJoined: Array<string>;
  authType: string;
  displayName: string;
  createdAt: Timestamp;
  avatarUrl: [] | [string];
  groupsCreated: Array<string>;
}

export interface _SERVICE {
  'addGroupCreated': ActorMethod<[string], Result_1>;
  'addGroupJoined': ActorMethod<[string], Result_1>;
  'createUser': ActorMethod<[string, [] | [string], string], Result>;
  'deleteUser': ActorMethod<[], Result_1>;
  'ensureUserProfile': ActorMethod<
    [[] | [string], [] | [string], [] | [string]],
    Result
  >;
  'getAllUsers': ActorMethod<[], Array<User>>;
  'getGroups': ActorMethod<[Principal], Array<string>>;
  'getUser': ActorMethod<[Principal], [] | [User]>;
  'searchUsers': ActorMethod<[string], Array<User>>;
  'updateUser': ActorMethod<[[] | [string], [] | [string]], Result>;
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
