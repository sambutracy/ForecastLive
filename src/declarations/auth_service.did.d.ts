import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type LoginResult = { 'error' : string } |
  { 'success' : { 'token' : string, 'user' : UserProfile } };
export type Result = { 'ok' : UserProfile } |
  { 'err' : string };
export interface UserProfile {
  'principal' : Principal,
  'username' : string,
  'authType' : string,
  'createdAt' : bigint,
  'role' : string,
  'email' : [] | [string],
}
export interface _SERVICE {
  'authenticateWithII' : ActorMethod<[], Result>,
  'createInitialAdmin' : ActorMethod<[string, string, string], boolean>,
  'getAllUsers' : ActorMethod<[], Array<UserProfile>>,
  'getUserByToken' : ActorMethod<[string], [] | [UserProfile]>,
  'icrc10_supported_standards' : ActorMethod<
    [],
    Array<{ 'url' : string, 'name' : string }>
  >,
  'icrc28_trusted_origins' : ActorMethod<
    [],
    { 'trusted_origins' : Array<string> }
  >,
  'login' : ActorMethod<[string, string], LoginResult>,
  'logout' : ActorMethod<[string], boolean>,
  'promoteToAdmin' : ActorMethod<[Principal], boolean>,
  'register' : ActorMethod<[string, string, string], Result>,
  'updateIIUserProfile' : ActorMethod<[string], Result>,
  'verifySession' : ActorMethod<[string], boolean>,
  'whoami' : ActorMethod<[], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
