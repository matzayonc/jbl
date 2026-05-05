import * as anchor from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { expect } from "chai";
import { setupTest, TestSetup } from "./setup";

describe("lp tokens", () => {
    // ── 1. Full round trip: deposit → take_lp → put_lp ───────────────────────
    describe("take_lp then put_lp restores position balance", () => {
        const DEPOSIT_AMOUNT = 100_000_000; // 100 tokens (6 decimals)

        let setup: TestSetup;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            setup = await setupTest();
            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.lpMintPda,
                owner: setup.authority.publicKey,
            });
        });

        it("mints LP tokens to user wallet after take_lp", async () => {
            const { program, mint, lendingAccountPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .deposit(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            // take_lp closes the user_position PDA and mints LP tokens into user's wallet
            await program.methods
                .takeLp(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();

            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal(DEPOSIT_AMOUNT.toString());

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalLpIssued.toString()).to.equal(DEPOSIT_AMOUNT.toString());
            expect(pool.totalDeposited.toString()).to.equal(DEPOSIT_AMOUNT.toString());
        });

        it("burns LP tokens and credits deposited_amount on put_lp", async () => {
            const { program, mint, lendingAccountPda, userPositionPda, authority, connection } = setup;

            await program.methods
                .putLp(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();

            // LP tokens are burned
            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal("0");

            // Position re-created with underlying value
            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.authority.toString()).to.equal(authority.publicKey.toString());
            expect(position.pool.toString()).to.equal(lendingAccountPda.toString());
            expect(position.depositedAmount.toString()).to.equal(DEPOSIT_AMOUNT.toString());
            expect(position.lpTokensOwed.toString()).to.equal("0");
            expect(position.debtShares.toString()).to.equal("0");

            // Pool LP supply is now zero
            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalLpIssued.toString()).to.equal("0");
            expect(pool.totalDeposited.toString()).to.equal(DEPOSIT_AMOUNT.toString());
        });
    });

    // ── 2. Withdraw underlying tokens after put_lp ───────────────────────────
    describe("withdraw after take_lp then put_lp recovers underlying tokens", () => {
        const DEPOSIT_AMOUNT = 100_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: TestSetup;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            setup = await setupTest();
            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.lpMintPda,
                owner: setup.authority.publicKey,
            });

            const { program, mint, userTokenAccount, authority } = setup;

            await program.methods
                .deposit(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            await program.methods
                .takeLp(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();

            await program.methods
                .putLp(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();
        });

        it("returns underlying tokens to user on withdraw", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .withdraw(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal("0");

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.depositedAmount.toString()).to.equal("0");

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal("0");

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal(INITIAL_BALANCE.toString());
        });
    });
});
