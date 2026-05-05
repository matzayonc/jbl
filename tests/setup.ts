import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider, BN } from "@anchor-lang/core";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Jbl } from "../target/types/jbl";

export interface FeeCurve {
  m1: BN;
  c1: BN;
  m2: BN;
  c2: BN;
}

export const DEFAULT_FEE_CURVE: FeeCurve = {
  m1: new BN(0),
  c1: new BN(50),
  m2: new BN(0),
  c2: new BN(0),
};

export interface TestSetup {
  provider: AnchorProvider;
  program: Program<Jbl>;
  connection: Connection;
  authority: Keypair;
  payer: Keypair;
  mint: PublicKey;
  lendingAccountPda: PublicKey;
  lendingVaultPda: PublicKey;
  lpMintPda: PublicKey;
  userPositionPda: PublicKey;
  userTokenAccount: PublicKey;
  feeCurve: FeeCurve;
}

/**
 * Sets up a complete test environment for the jbl program.
 *
 * @param feeCurve - The fee curve parameters (m1, c1, m2, c2) to use when creating the pool.
 * @returns A TestSetup object with all necessary accounts, PDAs, and program references.
 */
export async function setupTest(feeCurve: FeeCurve = DEFAULT_FEE_CURVE): Promise<TestSetup> {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Jbl as Program<Jbl>;
  const connection = provider.connection;

  const authority = Keypair.generate();
  const payer = Keypair.generate();

  // Airdrop SOL to payer and authority
  const airdropPayer = await connection.requestAirdrop(
    payer.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropPayer);

  const airdropAuthority = await connection.requestAirdrop(
    authority.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropAuthority);

  // Create a test token mint (6 decimals like USDC)
  const mint = await createMint(
    connection,
    payer,
    authority.publicKey,
    null,
    6
  );

  // Derive PDAs
  const [lendingAccountPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending"), authority.publicKey.toBuffer(), mint.toBuffer()],
    program.programId
  );

  const [lendingVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), lendingAccountPda.toBuffer()],
    program.programId
  );

  const [lpMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint"), lendingAccountPda.toBuffer()],
    program.programId
  );

  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_position"), lendingAccountPda.toBuffer(), authority.publicKey.toBuffer()],
    program.programId
  );

  // Create user token account and mint initial tokens (1000 tokens with 6 decimals)
  const userTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    authority.publicKey
  );

  await mintTo(
    connection,
    payer,
    mint,
    userTokenAccount,
    authority,
    1_000_000_000 // 1000 tokens
  );

  // Create the lending pool
  await program.methods
    .create(feeCurve.m1, feeCurve.c1, feeCurve.m2, feeCurve.c2)
    .accounts({ mint, authority: authority.publicKey, payer: payer.publicKey })
    .signers([payer, authority])
    .rpc();

  return {
    provider,
    program,
    connection,
    authority,
    payer,
    mint,
    lendingAccountPda,
    lendingVaultPda,
    lpMintPda,
    userPositionPda,
    userTokenAccount,
    feeCurve,
  };
}

export interface Lender {
  authority: Keypair;
  userTokenAccount: PublicKey;
  userPositionPda: PublicKey;
}

/**
 * Creates a new lender (depositor) for an existing pool.
 * Airdrops SOL, creates a token account for the pool's mint, and mints 1000 tokens.
 */
export async function createLender(setup: TestSetup): Promise<Lender> {
  const { connection, payer, mint, authority: mintAuthority, program, lendingAccountPda } = setup;

  const authority = Keypair.generate();

  const airdrop = await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdrop);

  const userTokenAccount = await createAssociatedTokenAccount(connection, payer, mint, authority.publicKey);

  await mintTo(connection, payer, mint, userTokenAccount, mintAuthority, 1_000_000_000);

  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_position"), lendingAccountPda.toBuffer(), authority.publicKey.toBuffer()],
    program.programId
  );

  return { authority, userTokenAccount, userPositionPda };
}

/**
 * Creates the user's LP token account for a given setup.
 * Must be called after the pool has been created on-chain (LP mint is initialized by create()).
 */
export async function createUserLpTokenAccount(setup: TestSetup): Promise<PublicKey> {
  const { connection, payer, lpMintPda, authority } = setup;
  return createAssociatedTokenAccount(
    connection,
    payer,
    lpMintPda,
    authority.publicKey
  );
}
