# Lens API examples

This repository is Orb's fork of [lens-protocol/api-examples](https://github.com/lens-protocol/api-examples).

The scripts show how to call the Lens API.
They send GraphQL requests through Apollo Client.
Accounts, signatures, and contract calls use viem 2.x.
The `dependencies` entry `viem` is `^2.52.2`.
The dependency list has no `ethers` package.

## Network

The scripts still target Polygon Mumbai.
Mumbai is a retired testnet.
`src/ethers.service.ts` sets the viem chain to `polygonMumbai`.

## Setup

Copy `.env.template` to `.env`.

```bash
cp .env.template .env
```

Install packages with npm.

```bash
npm install
```

`src/config.ts` reads the variables below.
Each script loads `src/config.ts` before it runs.
The process exits when a required variable is missing.

`PK` is the private key for the viem account.
`MUMBAI_RPC_URL` is the HTTP RPC URL.
`LENS_API` is the Lens GraphQL URL.
`LENS_HUB_CONTRACT` is the Lens hub address.
`LENS_PERIPHERY_CONTRACT` is the Lens periphery address.

`PROFILE_ID` is optional in `src/config.ts`.
Many scripts throw when `PROFILE_ID` is empty.
`INFURA_PROJECT_ID` and `INFURA_SECRET` are optional in `src/config.ts`.
`publications:post`, `publications:comment`, and `profile:set-profile-metadata` upload JSON through `src/ipfs.ts`.
The upload host is `ipfs.infura.io`.
Those three scripts fail when either Infura variable is empty.

`.env.template` still stores Mumbai values.
`MUMBAI_RPC_URL` is `https://rpc-mumbai.matic.today`.
`LENS_API` is `https://api-mumbai.lens.dev/`.
`LENS_HUB_CONTRACT` is `0x60Ae865ee4C725cd04353b5AAb364553f56ceF82`.
`LENS_PERIPHERY_CONTRACT` is `0xD5037d72877808cdE7F669563e9389930AF404E8`.
These template values point at the retired Mumbai testnet.
Editing `.env` does not change the viem chain.
The chain stays `polygonMumbai` in `src/ethers.service.ts`.

## Run

Script names live in the `scripts` section of `package.json`.
Each name has the form `area:method`.
Each script loads `.env` with `env-cmd`.
Each script runs `ts-node` on a file under `src/`.

Run login with this command.

```bash
npm run authentication:login
```

`authentication:login` requests a challenge and signs it.
`authentication:verify` checks the access token.
`authentication:refresh` requests a new access token.
`profile:get-profile` loads one profile.
That script requires `PROFILE_ID`.
