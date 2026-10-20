import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  burn,
  createBurnInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import bs58 from "bs58";
import { PRIVATE_KEY, PUBLIC_KEY, RPC_URL, TOKEN_MINT_ADDRESS } from "./address";

const connection = new Connection(RPC_URL, "confirmed");

export const TOKEN_DECIMALS = 9;

const getPayer = (): Keypair => {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
};

const requireMint = (): PublicKey => {
  if (!TOKEN_MINT_ADDRESS) throw new Error("TOKEN_MINT_ADDRESS is not set");
  return new PublicKey(TOKEN_MINT_ADDRESS);
};

export const mintTokens = async (fromAddress: string, toAddress: string, amount: number) => {
  if (amount <= 0) throw new Error("Amount must be positive");
  const payer = getPayer();
  const mint = requireMint();
  const user = new PublicKey(fromAddress);
  const userAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, user);
  const signature = await mintTo(connection, payer, mint, userAta.address, payer, amount);
  return signature;
};

export const burnTokens = async (fromAddress: string, toAddress: string, amount: number) => {
  if (amount <= 0) throw new Error("Amount must be positive");
  const payer = getPayer();
  const mint = requireMint();
  const vault = new PublicKey(PUBLIC_KEY || payer.publicKey.toBase58());
  const vaultAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, vault);
  const signature = await burn(connection, payer, mint, vaultAta.address, vault, amount);
  return signature;
};

export const sendNativeTokens = async (fromAddress: string, toAddress: string, amount: number) => {
  if (amount <= 0) throw new Error("Amount must be positive");
  const payer = getPayer();
  const recipient = new PublicKey(toAddress);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: amount,
    }),
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return signature;
};

export const processWithdrawal = async (userAddress: string, amountLamports: number) => {
  if (amountLamports <= 0) throw new Error("Amount must be positive");
  const payer = getPayer();
  const mint = requireMint();
  const user = new PublicKey(userAddress);
  const vault = payer.publicKey;
  const vaultAta = getAssociatedTokenAddressSync(mint, vault);

  const tx = new Transaction().add(
    createBurnInstruction(vaultAta, mint, vault, amountLamports),
    SystemProgram.transfer({
      fromPubkey: vault,
      toPubkey: user,
      lamports: amountLamports,
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  return signature;
};
