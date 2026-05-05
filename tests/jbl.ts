import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { setupTest, createUserLpTokenAccount, TestSetup } from "./setup";

describe("jbl", () => {
  describe("create_pool_with_lp", () => {
    let setup: TestSetup;
    let userLpTokenAccount: PublicKey;

    beforeEach(async () => {
      setup = await setupTest({
        m1: new anchor.BN(0),
        c1: new anchor.BN(50),
        m2: new anchor.BN(0),
        c2: new anchor.BN(0),
      });
    });

    it("Creates a lending account with LP token mint successfully", async () => {
      const { program, connection, authority, mint, lendingAccountPda, lendingVaultPda, lpMintPda } = setup;

      const lendingAccount = await program.account.pool.fetch(lendingAccountPda);

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
      const { program, connection, authority, mint, lendingAccountPda, lpMintPda, userTokenAccount } = setup;

      userLpTokenAccount = await createUserLpTokenAccount(setup);

      const depositAmount = 100000000; // 100 tokens with 6 decimals

      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userTokenAccount,
        })
        .signers([authority])
        .rpc();

      await program.methods
        .takeLp(new anchor.BN(depositAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userLpTokenAccount,
        })
        .signers([authority])
        .rpc();

      const lendingAccount = await program.account.pool.fetch(lendingAccountPda);

      expect(lendingAccount.totalDeposited.toString()).to.equal(depositAmount.toString());
      expect(lendingAccount.totalLpIssued.toString()).to.equal(depositAmount.toString()); // 1:1 ratio

      const userLpAccountAfterFirst = await getAccount(connection, userLpTokenAccount);
      expect(userLpAccountAfterFirst.amount.toString()).to.equal(depositAmount.toString());

      console.log("✅ First deposit successful - 1:1 LP ratio");
      console.log("Deposited:", depositAmount);
      console.log("LP tokens issued:", lendingAccount.totalLpIssued.toString());
      console.log("User LP token balance:", userLpAccountAfterFirst.amount.toString());

      const secondDepositAmount = 50000000; // 50 tokens

      await program.methods
        .deposit(new anchor.BN(secondDepositAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userTokenAccount,
        })
        .signers([authority])
        .rpc();

      await program.methods
        .takeLp(new anchor.BN(secondDepositAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userLpTokenAccount,
        })
        .signers([authority])
        .rpc();

      const updatedLendingAccount = await program.account.pool.fetch(lendingAccountPda);

      const expectedTotalLp = depositAmount + secondDepositAmount;
      expect(updatedLendingAccount.totalLpIssued.toString()).to.equal(expectedTotalLp.toString());

      const userLpAccountAfterSecond = await getAccount(connection, userLpTokenAccount);
      expect(userLpAccountAfterSecond.amount.toString()).to.equal(expectedTotalLp.toString());

      console.log("✅ Second deposit successful");
    });

    it("Tests borrowing against deposited funds", async () => {
      const { program, connection, authority, mint, lendingAccountPda, userTokenAccount } = setup;

      const depositAmount = 100000000; // 100 tokens with 6 decimals

      await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userTokenAccount,
        })
        .signers([authority])
        .rpc();

      const userTokenBalanceBefore = await getAccount(connection, userTokenAccount);
      console.log("User token balance before borrow:", userTokenBalanceBefore.amount.toString());

      const borrowAmount = 50000000; // 50 tokens (50% of deposited, LTV is 75%)

      await program.methods
        .borrow(new anchor.BN(borrowAmount))
        .accounts({
          mint,
          poolAuthority: authority.publicKey,
          authority: authority.publicKey,
          userTokenAccount,
        })
        .signers([authority])
        .rpc();

      const lendingAccount = await program.account.pool.fetch(lendingAccountPda);

      expect(lendingAccount.totalBorrowed.toString()).to.equal(borrowAmount.toString());

      const userTokenBalanceAfter = await getAccount(connection, userTokenAccount);
      // userTokenAccount started with 1000, deposited 100, now borrowed 50. Balance should be 950.
      const expectedBalance = BigInt(userTokenBalanceBefore.amount.toString()) + BigInt(borrowAmount);
      expect(userTokenBalanceAfter.amount.toString()).to.equal(expectedBalance.toString());

      console.log("✅ Borrow successful");
    });
  });
});