import type { IArgon2Options } from "hash-wasm";
import type * as idb from "idb-keyval";

export type AsyncCrypto = Omit<Crypto, "getRandomValues"> & {
  getRandomValues<T extends DataView | Float32Array | Float64Array | Uint8ClampedArray | Uint8Array | Int8Array | Int16Array | Int32Array | Uint16Array | Uint32Array | null>(array: T): T | Promise<T>;
}

export type ArgonParams = Pick<IArgon2Options, "parallelism" | "memorySize" | "iterations">;

export type VaultPrepareParams = Partial<{
  crypto: AsyncCrypto;
  performance: Performance;
  keyStore: idb.UseStore;
  vaultStore: idb.UseStore;
}>;

export interface IVaultFactory<U extends IVaultBackedBy<any> | IVault> {
  readonly prepare: (params?: VaultPrepareParams) => Promise<void>;
  readonly open: (id?: string) => Promise<U>;
  readonly list: () => Promise<string[]>;
  readonly meta: (id: string) => Promise<Map<string, unknown> | undefined>;
  readonly delete: (id: string) => Promise<void>;
}

export interface IVaultBackedBy<T> {
  readonly id: string;
  readonly argonParams: Readonly<ArgonParams>;
  readonly meta: Map<string, unknown>;
  setPassword(password: string): Promise<this>;
  load(deserialize: (_: T) => Promise<void>): Promise<this>;
  save(serialize: () => Promise<T>): Promise<this>;
}

export interface IVault {
  readonly id: string;
  readonly argonParams: Readonly<ArgonParams>;
  readonly meta: Map<string, unknown>;
  setPassword(password: string): Promise<this>;
  load(): Promise<this>;
  save(): Promise<this>;
}
