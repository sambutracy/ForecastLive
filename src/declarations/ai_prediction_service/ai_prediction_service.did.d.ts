import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface HttpHeader { 'value' : string, 'name' : string }
export interface HttpResponsePayload {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<HttpHeader>,
}
export type Result = { 'ok' : Array<string> } |
  { 'err' : string };
export interface TransformArgs {
  'context' : Uint8Array | number[],
  'response' : HttpResponsePayload,
}
export interface _SERVICE {
  'parseScreenshot' : ActorMethod<
    [string, string, string, string, string],
    Result
  >,
  'setParserConfig' : ActorMethod<[string, string], undefined>,
  'transform' : ActorMethod<[TransformArgs], HttpResponsePayload>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
