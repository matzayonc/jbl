import * as anchor from "@anchor-lang/core";
import { getAccount } from "@solana/spl-token";
import { expect } from "chai";
import { setupTest, createLender } from "./setup";

describe("deposit and withdraw", () => {
    // ── 1. Simple deposit then full withdraw ─────────────────────────────────────
    describe("simple deposit and full withdraw", () => {
        const DEPOSIT_AMOUNT = 100_000_000; // 100 tokens (6 decimals)
        const INITIAL_BALANCE = 1_000_000_000; // 1000 tokens minted in setup

        let setup: ReturnType<typeof setupTest> extends Promise<infer T> ? T : never;

        before(async () => {
            setup = await setupTest();
        });

        it("asserts pool and position state after deposit", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, lpMintPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .deposit(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.authority.toString()).to.equal(authority.publicKey.toString());
            expect(pool.mint.toString()).to.equal(mint.toString());
            expect(pool.lpMint.toString()).to.equal(lpMintPda.toString());
            expect(pool.totalDeposited.toString()).to.equal(DEPOSIT_AMOUNT.toString());
            expect(pool.totalLpIssued.toString()).to.equal(DEPOSIT_AMOUNT.toString()); // 1:1 on first deposit
            expect(pool.totalBorrowed.toString()).to.equal("0");
            expect(pool.totalDebtShares.toString()).to.equal("0");
            expect(pool.ltvPercent).to.equal(75);

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.authority.toString()).to.equal(authority.publicKey.toString());
            expect(position.pool.toString()).to.equal(lendingAccountPda.toString());
            expect(position.depositedAmount.toString()).to.equal(DEPOSIT_AMOUNT.toString());
            expect(position.lpTokensOwed.toString()).to.equal(DEPOSIT_AMOUNT.toString());
            expect(position.debtShares.toString()).to.equal("0");

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal(DEPOSIT_AMOUNT.toString());

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal((INITIAL_BALANCE - DEPOSIT_AMOUNT).toString());
        });

        it("asserts pool and position state after full withdraw", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .withdraw(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal("0");
            expect(pool.totalLpIssued.toString()).to.equal("0");
            expect(pool.totalBorrowed.toString()).to.equal("0");

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.depositedAmount.toString()).to.equal("0");
            expect(position.lpTokensOwed.toString()).to.equal("0");
            expect(position.debtShares.toString()).to.equal("0");

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal("0");

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal(INITIAL_BALANCE.toString());
        });
    });

    // ── 2. Partial withdraw ───────────────────────────────────────────────────────
    describe("partial withdraw", () => {
        const DEPOSIT_AMOUNT = 100_000_000;
        const FIRST_WITHDRAW = 40_000_000;
        const SECOND_WITHDRAW = 60_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: ReturnType<typeof setupTest> extends Promise<infer T> ? T : never;

        before(async () => {
            setup = await setupTest();
            await setup.program.methods
                .deposit(new anchor.BN(DEPOSIT_AMOUNT))
                .accounts({ mint: setup.mint, authority: setup.authority.publicKey, userTokenAccount: setup.userTokenAccount })
                .signers([setup.authority])
                .rpc();
        });

        it("asserts correct state after partial withdraw (40 of 100 tokens)", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .withdraw(new anchor.BN(FIRST_WITHDRAW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal((DEPOSIT_AMOUNT - FIRST_WITHDRAW).toString());
            expect(pool.totalLpIssued.toString()).to.equal((DEPOSIT_AMOUNT - FIRST_WITHDRAW).toString());
            expect(pool.totalBorrowed.toString()).to.equal("0");

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.depositedAmount.toString()).to.equal((DEPOSIT_AMOUNT - FIRST_WITHDRAW).toString());
            expect(position.lpTokensOwed.toString()).to.equal((DEPOSIT_AMOUNT - FIRST_WITHDRAW).toString());
            expect(position.debtShares.toString()).to.equal("0");

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal((DEPOSIT_AMOUNT - FIRST_WITHDRAW).toString());

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal((INITIAL_BALANCE - DEPOSIT_AMOUNT + FIRST_WITHDRAW).toString());
        });

        it("asserts correct state after withdrawing the remainder (60 tokens)", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .withdraw(new anchor.BN(SECOND_WITHDRAW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal("0");
            expect(pool.totalLpIssued.toString()).to.equal("0");

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.depositedAmount.toString()).to.equal("0");
            expect(position.lpTokensOwed.toString()).to.equal("0");

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal("0");

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal(INITIAL_BALANCE.toString());
        });
    });

    // ── 3. Multiple lenders in the same pool ─────────────────────────────────────
    describe("multiple lenders in the same pool", () => {
        const DEPOSIT_A = 100_000_000;
        const DEPOSIT_B = 200_000_000;
        const WITHDRAW_A = 100_000_000;
        const WITHDRAW_B_PARTIAL = 80_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: ReturnType<typeof setupTest> extends Promise<infer T> ? T : never;
        let lenderA: Awaited<ReturnType<typeof createLender>>;
        let lenderB: Awaited<ReturnType<typeof createLender>>;

        before(async () => {
            setup = await setupTest();
            [lenderA, lenderB] = await Promise.all([createLender(setup), createLender(setup)]);

            await setup.program.methods
                .deposit(new anchor.BN(DEPOSIT_A))
                .accounts({ mint: setup.mint, authority: lenderA.authority.publicKey, userTokenAccount: lenderA.userTokenAccount })
                .signers([lenderA.authority])
                .rpc();
            await setup.program.methods
                .deposit(new anchor.BN(DEPOSIT_B))
                .accounts({ mint: setup.mint, authority: lenderB.authority.publicKey, userTokenAccount: lenderB.userTokenAccount })
                .signers([lenderB.authority])
                .rpc();
        });

        it("asserts pool totals reflect both deposits", async () => {
            const pool = await setup.program.account.pool.fetch(setup.lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal((DEPOSIT_A + DEPOSIT_B).toString());
            expect(pool.totalLpIssued.toString()).to.equal((DEPOSIT_A + DEPOSIT_B).toString());
            expect(pool.totalBorrowed.toString()).to.equal("0");

            const positionA = await setup.program.account.userPosition.fetch(lenderA.userPositionPda);
            expect(positionA.depositedAmount.toString()).to.equal(DEPOSIT_A.toString());
            expect(positionA.lpTokensOwed.toString()).to.equal(DEPOSIT_A.toString());

            const positionB = await setup.program.account.userPosition.fetch(lenderB.userPositionPda);
            expect(positionB.depositedAmount.toString()).to.equal(DEPOSIT_B.toString());
            expect(positionB.lpTokensOwed.toString()).to.equal(DEPOSIT_B.toString());

            const vault = await getAccount(setup.connection, setup.lendingVaultPda);
            expect(vault.amount.toString()).to.equal((DEPOSIT_A + DEPOSIT_B).toString());
        });

        it("lender A does a full withdraw — pool reflects only lender B remaining", async () => {
            await setup.program.methods
                .withdraw(new anchor.BN(WITHDRAW_A))
                .accounts({ mint: setup.mint, authority: lenderA.authority.publicKey, userTokenAccount: lenderA.userTokenAccount })
                .signers([lenderA.authority])
                .rpc();

            const pool = await setup.program.account.pool.fetch(setup.lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal(DEPOSIT_B.toString());
            expect(pool.totalLpIssued.toString()).to.equal(DEPOSIT_B.toString());

            const positionA = await setup.program.account.userPosition.fetch(lenderA.userPositionPda);
            expect(positionA.depositedAmount.toString()).to.equal("0");
            expect(positionA.lpTokensOwed.toString()).to.equal("0");

            const userTokenA = await getAccount(setup.connection, lenderA.userTokenAccount);
            expect(userTokenA.amount.toString()).to.equal(INITIAL_BALANCE.toString());

            const vault = await getAccount(setup.connection, setup.lendingVaultPda);
            expect(vault.amount.toString()).to.equal(DEPOSIT_B.toString());
        });

        it("lender B does a partial withdraw — correct remaining pool state", async () => {
            await setup.program.methods
                .withdraw(new anchor.BN(WITHDRAW_B_PARTIAL))
                .accounts({ mint: setup.mint, authority: lenderB.authority.publicKey, userTokenAccount: lenderB.userTokenAccount })
                .signers([lenderB.authority])
                .rpc();

            const pool = await setup.program.account.pool.fetch(setup.lendingAccountPda);
            expect(pool.totalDeposited.toString()).to.equal((DEPOSIT_B - WITHDRAW_B_PARTIAL).toString());
            expect(pool.totalLpIssued.toString()).to.equal((DEPOSIT_B - WITHDRAW_B_PARTIAL).toString());

            const positionB = await setup.program.account.userPosition.fetch(lenderB.userPositionPda);
            expect(positionB.depositedAmount.toString()).to.equal((DEPOSIT_B - WITHDRAW_B_PARTIAL).toString());
            expect(positionB.lpTokensOwed.toString()).to.equal((DEPOSIT_B - WITHDRAW_B_PARTIAL).toString());

            const vault = await getAccount(setup.connection, setup.lendingVaultPda);
            expect(vault.amount.toString()).to.equal((DEPOSIT_B - WITHDRAW_B_PARTIAL).toString());

            const userTokenB = await getAccount(setup.connection, lenderB.userTokenAccount);
            expect(userTokenB.amount.toString()).to.equal((INITIAL_BALANCE - DEPOSIT_B + WITHDRAW_B_PARTIAL).toString());
        });
    });
});
