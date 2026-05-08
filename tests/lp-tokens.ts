import * as anchor from "@anchor-lang/core";
import { BN } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { expect } from "chai";
import { setupTest, participateInPool, TestSetup } from "./utils";

describe("lp tokens", () => {
    // ── 1. participate mints LP tokens proportionally ─────────────────────────
    describe("participate mints LP tokens to the user", () => {
        const PARTICIPATE_AMOUNT = 100_000_000;

        let setup: TestSetup;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            setup = await setupTest();
            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.lpMintPda,
                owner: setup.authority.publicKey,
            });
            await participateInPool(setup, PARTICIPATE_AMOUNT);
        });

        it("mints LP tokens to user wallet after participate", async () => {
            const { connection } = setup;
            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
        });

        it("pool records total_lp_issued and total_lend_deposited", async () => {
            const poolAccount = await setup.program.account.pool.fetch(setup.pool);
            expect(poolAccount.totalLpIssued.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
            expect(poolAccount.totalLendDeposited.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
        });
    });

    // ── 2. put_lp burns LP tokens and credits collateral_deposited ────────────
    describe("put_lp burns LP and creates a position", () => {
        const PARTICIPATE_AMOUNT = 100_000_000;

        let setup: TestSetup;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            setup = await setupTest();
            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.lpMintPda,
                owner: setup.authority.publicKey,
            });
            await participateInPool(setup, PARTICIPATE_AMOUNT);
        });

        it("burns LP tokens and creates position with collateral_deposited", async () => {
            const { program, pool, userPositionPda, authority, connection } = setup;

            await program.methods
                .putLp(new BN(PARTICIPATE_AMOUNT))
                .accounts({ pool, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();

            // LP tokens are burned.
            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal("0");

            // Position created with underlying lend value as collateral_deposited.
            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.authority.toString()).to.equal(authority.publicKey.toString());
            expect(position.pool.toString()).to.equal(pool.toString());
            expect(position.collateralDeposited.toNumber()).to.be.greaterThan(0);
            expect(position.lpTokensOwed.toString()).to.equal("0");
            expect(position.debtShares.toString()).to.equal("0");

            // Pool LP supply is now zero.
            const poolAccount = await program.account.pool.fetch(pool);
            expect(poolAccount.totalLpIssued.toString()).to.equal("0");
        });
    });

    // ── 3. put_lp with partial LP amount leaves remaining LP intact ───────────
    describe("put_lp with partial LP amount", () => {
        const PARTICIPATE_AMOUNT = 100_000_000;
        const PUT_AMOUNT = 40_000_000;

        let setup: TestSetup;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            setup = await setupTest();
            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.lpMintPda,
                owner: setup.authority.publicKey,
            });
            await participateInPool(setup, PARTICIPATE_AMOUNT);
        });

        it("burns only the specified LP amount, leaving the rest intact", async () => {
            const { program, pool, authority, connection } = setup;

            await program.methods
                .putLp(new BN(PUT_AMOUNT))
                .accounts({ pool, authority: authority.publicKey, userLpTokenAccount })
                .signers([authority])
                .rpc();

            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal(
                (PARTICIPATE_AMOUNT - PUT_AMOUNT).toString()
            );

            const poolAccount = await program.account.pool.fetch(pool);
            expect(poolAccount.totalLpIssued.toString()).to.equal(
                (PARTICIPATE_AMOUNT - PUT_AMOUNT).toString()
            );
        });
    });
});
