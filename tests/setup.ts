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
    userTokenAccount,
    feeCurve,
  };
}
