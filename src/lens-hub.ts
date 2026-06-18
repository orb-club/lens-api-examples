import type { Abi, AbiFunction, Hex } from 'viem';
import {
  LENS_HUB_ABI,
  LENS_HUB_CONTRACT,
  LENS_PERIPHERY_ABI,
  LENS_PERIPHERY_CONTRACT,
} from './config';
import {
  account,
  publicClient,
  SentTransaction,
  walletClient,
} from './ethers.service';

// ethers v5 style transaction overrides that may be passed as a trailing arg.
const OVERRIDE_KEYS = new Set([
  'gasLimit',
  'gasPrice',
  'maxFeePerGas',
  'maxPriorityFeePerGas',
  'nonce',
  'value',
  'from',
  'type',
  'accessList',
  'customData',
  'ccipReadEnabled',
]);

const isOverrides = (arg: unknown): boolean => {
  if (arg === null || typeof arg !== 'object' || Array.isArray(arg)) {
    return false;
  }
  const keys = Object.keys(arg as Record<string, unknown>);
  return keys.length > 0 && keys.every((key) => OVERRIDE_KEYS.has(key));
};

// translate ethers v5 overrides into the equivalent viem write options.
const mapOverrides = (overrides: Record<string, any>) => {
  const mapped: Record<string, any> = {};
  if (overrides.gasLimit !== undefined) mapped.gas = BigInt(overrides.gasLimit);
  if (overrides.gasPrice !== undefined)
    mapped.gasPrice = BigInt(overrides.gasPrice);
  if (overrides.maxFeePerGas !== undefined)
    mapped.maxFeePerGas = BigInt(overrides.maxFeePerGas);
  if (overrides.maxPriorityFeePerGas !== undefined)
    mapped.maxPriorityFeePerGas = BigInt(overrides.maxPriorityFeePerGas);
  if (overrides.nonce !== undefined) mapped.nonce = Number(overrides.nonce);
  if (overrides.value !== undefined) mapped.value = BigInt(overrides.value);
  return mapped;
};

const findFunction = (abi: Abi, name: string): AbiFunction | undefined => {
  return abi.find(
    (item): item is AbiFunction => item.type === 'function' && item.name === name
  );
};

// build an ethers.Contract-like object on top of viem so the existing call
// sites keep working unchanged. each method packs the JS arguments into the
// viem `args` array (handling a trailing ethers overrides object), then calls
// readContract for view/pure functions or writeContract for state changing
// functions. writes return { hash, wait } to mirror the ethers tx object.
export const createContract = (address: string, abi: Abi) => {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        const fn = findFunction(abi, prop);
        if (!fn) {
          return undefined;
        }

        const isRead =
          fn.stateMutability === 'view' || fn.stateMutability === 'pure';

        return (...callArgs: any[]) => {
          let args = callArgs;
          let options: Record<string, any> = {};

          // a trailing ethers style overrides object becomes viem options.
          if (
            callArgs.length === fn.inputs.length + 1 &&
            isOverrides(callArgs[callArgs.length - 1])
          ) {
            args = callArgs.slice(0, -1);
            options = mapOverrides(callArgs[callArgs.length - 1]);
          }

          if (isRead) {
            return publicClient.readContract({
              address: address as Hex,
              abi,
              functionName: prop,
              args,
            });
          }

          // state changing call -> writeContract, returning an ethers-like tx.
          const tx: Promise<SentTransaction> = walletClient
            .writeContract({
              address: address as Hex,
              abi,
              functionName: prop,
              args,
              account,
              chain: walletClient.chain,
              ...options,
            })
            .then((hash) => ({
              hash,
              wait: () => publicClient.waitForTransactionReceipt({ hash }),
            }));

          return tx;
        };
      },
    }
  ) as Record<string, (...args: any[]) => any>;
};

// lens contract info can all be found on the deployed
// contract address on polygon.
export const lensHub = createContract(LENS_HUB_CONTRACT, LENS_HUB_ABI as Abi);

export const lensPeriphery = createContract(
  LENS_PERIPHERY_CONTRACT,
  LENS_PERIPHERY_ABI as Abi
);
