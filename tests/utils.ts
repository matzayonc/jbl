import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider, BN } from "@anchor-lang/core";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection, SystemProgram } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Jbl } from "../target/types/jbl";

/** Size of the Pool account on-chain: 8-byte discriminant + Pool struct (41 144 bytes). */
export const POOL_SPACE = 8 + 41144;

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
  pool: PublicKey;
  statePda: PublicKey;
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

  // Pool is a keypair account (too large for on-chain PDA allocation via CPI).
  // Pre-create it in a top-level transaction so the runtime has no size restriction.
  const poolKeypair = Keypair.generate();
  const pool = poolKeypair.publicKey;

  // Derive the singleton global state PDA (authority for all CPIs)
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("state")],
    program.programId
  );

  const [lendingVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), pool.toBuffer()],
    program.programId
  );

  const [lpMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint"), pool.toBuffer()],
    program.programId
  );

  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_position"), pool.toBuffer(), authority.publicKey.toBuffer()],
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

  // Pre-create the pool account via SystemProgram.createAccount (top-level instruction,
  // no CPI size limit).  Pool keypair signs this instruction.
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SPACE);
  const createPoolIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: pool,
    lamports: poolRent,
    space: POOL_SPACE,
    programId: program.programId,
  });

  // Create the lending pool — state PDA is used as authority for vault and LP mint.
  await program.methods
    .create(feeCurve.m1, feeCurve.c1, feeCurve.m2, feeCurve.c2)
    .accounts({
      pool,
      mint,
      authority: authority.publicKey,
      payer: payer.publicKey,
    })
    .preInstructions([createPoolIx])
    .signers([payer, authority, poolKeypair])
    .rpc();

  return {
    provider,
    program,
    connection,
    authority,
    payer,
    mint,
    pool,
    statePda,
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
  const { connection, payer, mint, authority: mintAuthority, program, pool } = setup;

  const authority = Keypair.generate();

  const airdrop = await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdrop);

  const userTokenAccount = await createAssociatedTokenAccount(connection, payer, mint, authority.publicKey);

  await mintTo(connection, payer, mint, userTokenAccount, mintAuthority, 1_000_000_000);

  const [userPositionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_position"), pool.toBuffer(), authority.publicKey.toBuffer()],
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
