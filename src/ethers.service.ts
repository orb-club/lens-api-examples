import {
  createPublicClient,
  createWalletClient,
  http,
  parseSignature,
  type Account,
  type Hex,
  type TransactionReceipt,
  type TypedDataDomain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonMumbai } from 'viem/chains';
import { MUMBAI_RPC_URL, PK } from './config';
import { omit } from './helpers';

// the private key is loaded from the env and turned into a viem account.
// the key value itself is never logged or handled directly.
export const account: Account = privateKeyToAccount(PK as Hex);

// public client is used for reads and waiting on transaction receipts.
export const publicClient = createPublicClient({
  chain: polygonMumbai,
  transport: http(MUMBAI_RPC_URL),
});

// wallet client is used for signing and sending transactions.
export const walletClient = createWalletClient({
  account,
  chain: polygonMumbai,
  transport: http(MUMBAI_RPC_URL),
});

// kept for API compatibility with the previous ethers based code.
// it exposes `.address` like the old ethers Wallet did.
export const getSigner = () => {
  return account;
};

export const getAddressFromSigner = () => {
  return getSigner().address;
};

// derive the EIP-712 primary type from the typed data definition.
// viem requires the top level struct name explicitly; ethers inferred it.
// the primary type is the only entry in `types` that is not `EIP712Domain`.
const getPrimaryType = (types: Record<string, unknown>): string => {
  const keys = Object.keys(types).filter((key) => key !== 'EIP712Domain');
  if (keys.length !== 1) {
    throw new Error(
      `Could not derive EIP-712 primaryType, expected exactly one struct but found: ${keys.join(
        ', '
      )}`
    );
  }
  return keys[0];
};

export const signedTypeData = (
  domain: TypedDataDomain,
  types: Record<string, Array<{ name: string; type: string }>>,
  value: Record<string, any>
): Promise<Hex> => {
  // remove the __typename from the signature!
  const cleanDomain = omit(domain, '__typename') as TypedDataDomain;
  const cleanTypes = omit(types, '__typename') as Record<
    string,
    Array<{ name: string; type: string }>
  >;
  const cleanValue = omit(value, '__typename') as Record<string, any>;

  const primaryType = getPrimaryType(cleanTypes);

  // viem adds the EIP712Domain entry implicitly, so drop it if present.
  const { EIP712Domain: _ignored, ...typesWithoutDomain } = cleanTypes;

  return walletClient.signTypedData({
    account,
    domain: cleanDomain,
    types: typesWithoutDomain,
    primaryType,
    message: cleanValue,
  });
};

// viem's parseSignature returns { r, s, v, yParity } with v as a bigint.
// we expose v as a number to mirror the ethers v5 splitSignature shape that
// the *WithSig contract calls expect (sig.v is a uint8).
export const splitSignature = (signature: string) => {
  const { r, s, v, yParity } = parseSignature(signature as Hex);
  return {
    r,
    s,
    v: v !== undefined ? Number(v) : yParity + 27,
    yParity,
  };
};

export interface SentTransaction {
  hash: Hex;
  wait: () => Promise<TransactionReceipt>;
}

export const sendTx = async (transaction: {
  to: string;
  from?: string;
  data?: string;
  value?: bigint;
  gasLimit?: bigint;
}): Promise<SentTransaction> => {
  const hash = await walletClient.sendTransaction({
    account,
    to: transaction.to as Hex,
    data: transaction.data as Hex | undefined,
    value: transaction.value,
    gas: transaction.gasLimit,
  });

  return {
    hash,
    wait: () => publicClient.waitForTransactionReceipt({ hash }),
  };
};

export const signText = (text: string): Promise<Hex> => {
  return walletClient.signMessage({ account, message: text });
};
