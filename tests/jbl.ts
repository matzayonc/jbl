import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider } from "@anchor-lang/core";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { Jbl } from "../target/types/jbl";

describe("jbl", () => {
  // Configure the client to use the local cluster.
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Jbl as Program<Jbl>;
  const connection = provider.connection;

  describe("create_lending_account_with_lp", () => {
    let authority: Keypair;
    let payer: Keypair;
    let mint: PublicKey;
    let lendingAccountPda: PublicKey;
    let lendingVaultPda: PublicKey;
    let lpMintPda: PublicKey;
    let userTokenAccount: PublicKey;
    let userLpTokenAccount: PublicKey;

    beforeEach(async () => {
      // Create fresh keypairs for each test
      authority = Keypair.generate();
      payer = Keypair.generate();

      // Airdrop SOL to accounts
      const airdropSignaturePayer = await connection.requestAirdrop(
        payer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignaturePayer);

      const airdropSignatureAuthority = await connection.requestAirdrop(
        authority.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignatureAuthority);

      // Create a test token mint
      mint = await createMint(
        connection,
        payer,
        authority.publicKey,
        null,
        6 // 6 decimals like USDC
      );

      // Derive PDAs
      [lendingAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending"), authority.publicKey.toBuffer(), mint.toBuffer()],
        program.programId
      );

      [lendingVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_vault"), lendingAccountPda.toBuffer()],
        program.programId
      );

      [lpMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), lendingAccountPda.toBuffer()],
        program.programId
      );

      // Create user token accounts
      userTokenAccount = await createAssociatedTokenAccount(
        connection,
        payer,
        mint,
        authority.publicKey
      );

      // Mint some tokens to the user for testing
      await mintTo(
        connection,
        payer,
        mint,
        userTokenAccount,
        authority,
        1000000000 // 1000 tokens with 6 decimals
      );
    });

    it("Creates a lending account with LP token mint successfully", async () => {
      // Execute the create_lending_account instruction
      const txSignature = await program.methods
        .createLendingAccount()
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          payer: payer.publicKey,
        })
        .signers([payer, authority])
        .rpc();

      // Confirm transaction
      await connection.confirmTransaction(txSignature);

      // Fetch the created account
      const lendingAccount = await program.account.lendingAccount.fetch(lendingAccountPda);

      // Verify the account data
      expect(lendingAccount.authority.toString()).to.equal(authority.publicKey.toString());
      expect(lendingAccount.mint.toString()).to.equal(mint.toString());
      expect(lendingAccount.lpMint.toString()).to.equal(lpMintPda.toString());
      expect(lendingAccount.totalDeposited.toString()).to.equal("0");
      expect(lendingAccount.totalBorrowed.toString()).to.equal("0");
      expect(lendingAccount.totalLpIssued.toString()).to.equal("0");

      console.log("✅ Lending account with LP mint created successfully");
      console.log("Authority:", authority.publicKey.toString());
      console.log("Mint:", mint.toString());
      console.log("LP Mint:", lendingAccount.lpMint.toString());
      console.log("Lending Account PDA:", lendingAccountPda.toString());
      console.log("Lending Vault PDA:", lendingVaultPda.toString());
      console.log("LP Mint PDA:", lpMintPda.toString());
    });

    it("Tests LP token ratio calculation on deposit", async () => {
      // First create the lending account
      await program.methods
        .createLendingAccount()
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          payer: payer.publicKey,
        })
        .signers([payer, authority])
        .rpc();

      // Create LP token account for user
      userLpTokenAccount = await createAssociatedTokenAccount(
        connection,
        payer,
        lpMintPda,
        authority.publicKey
      );

      const depositAmount = 100000000; // 100 tokens with 6 decimals

      // Execute first deposit
      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userTokenAccount: userTokenAccount,
        })
        .signers([authority])
        .rpc();

      // Claim LP tokens
      await program.methods
        .takeLp()
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userLpTokenAccount: userLpTokenAccount,
        })
        .signers([authority])
        .rpc();

      // Check the lending account state
      const lendingAccount = await program.account.lendingAccount.fetch(lendingAccountPda);

      expect(lendingAccount.totalDeposited.toString()).to.equal(depositAmount.toString());
      expect(lendingAccount.totalLpIssued.toString()).to.equal(depositAmount.toString()); // 1:1 ratio

      // Verify user LP token balance after first deposit
      const userLpAccountAfterFirst = await getAccount(connection, userLpTokenAccount);
      expect(userLpAccountAfterFirst.amount.toString()).to.equal(depositAmount.toString());

      console.log("✅ First deposit successful - 1:1 LP ratio");
      console.log("Deposited:", depositAmount);
      console.log("LP tokens issued:", lendingAccount.totalLpIssued.toString());
      console.log("User LP token balance:", userLpAccountAfterFirst.amount.toString());

      // Make a second deposit to test ratio calculation
      const secondDepositAmount = 50000000; // 50 tokens

      await program.methods
        .deposit(new anchor.BN(secondDepositAmount))
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userTokenAccount: userTokenAccount,
        })
        .signers([authority])
        .rpc();

      // Claim LP tokens for second deposit
      await program.methods
        .takeLp()
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userLpTokenAccount: userLpTokenAccount,
        })
        .signers([authority])
        .rpc();

      const updatedLendingAccount = await program.account.lendingAccount.fetch(lendingAccountPda);

      const expectedTotalLp = depositAmount + secondDepositAmount;
      expect(updatedLendingAccount.totalLpIssued.toString()).to.equal(expectedTotalLp.toString());

      // Verify user LP token balance after second deposit
      const userLpAccountAfterSecond = await getAccount(connection, userLpTokenAccount);
      expect(userLpAccountAfterSecond.amount.toString()).to.equal(expectedTotalLp.toString());

      console.log("✅ Second deposit successful");
    });

    it("Tests borrowing against deposited funds", async () => {
      // First create the lending account
      await program.methods
        .createLendingAccount()
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          payer: payer.publicKey,
        })
        .signers([payer, authority])
        .rpc();

      const depositAmount = 100000000; // 100 tokens with 6 decimals

      // First deposit to have funds in the vault
      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userTokenAccount: userTokenAccount,
        })
        .signers([authority])
        .rpc();

      // Check balance before borrow
      const userTokenBalanceBefore = await getAccount(connection, userTokenAccount);
      console.log("User token balance before borrow:", userTokenBalanceBefore.amount.toString());

      const borrowAmount = 50000000; // 50 tokens (50% of deposited, LTV is 75%)

      // Execute borrow instruction
      await program.methods
        .borrow(new anchor.BN(borrowAmount))
        .accounts({
          mint: mint,
          authority: authority.publicKey,
          userTokenAccount: userTokenAccount,
        })
        .signers([authority])
        .rpc();

      // Check the lending account state after borrow
      const lendingAccount = await program.account.lendingAccount.fetch(lendingAccountPda);

      expect(lendingAccount.totalBorrowed.toString()).to.equal(borrowAmount.toString());

      // Check balance after borrow
      const userTokenBalanceAfter = await getAccount(connection, userTokenAccount);
      // userTokenAccount started with 1000, deposited 100, now borrowed 50. Balance should be 1000 - 100 + 50 = 950.
      const expectedBalance = BigInt(userTokenBalanceBefore.amount.toString()) + BigInt(borrowAmount);
      expect(userTokenBalanceAfter.amount.toString()).to.equal(expectedBalance.toString());

      console.log("✅ Borrow successful");
    });
  });
});