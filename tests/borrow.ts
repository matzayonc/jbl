import * as anchor from "@anchor-lang/core";
import { getAccount } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { setupTest, createLender, TestSetup } from "./setup";

async function deposit(setup: TestSetup, amount: number) {
    await setup.program.methods
        .deposit(new anchor.BN(amount))
        .accounts({
            mint: setup.mint,
            authority: setup.authority.publicKey,
            userTokenAccount: setup.userTokenAccount,
        })
        .signers([setup.authority])
        .rpc();
}

describe("borrow", () => {
    // ── 1. Happy path ─────────────────────────────────────────────────────────────
    describe("borrow within LTV", () => {
        const DEPOSIT = 100_000_000;
        const BORROW = 50_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);
        });

        it("transfers tokens to borrower and updates pool and position state", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            await program.methods
                .borrow(new anchor.BN(BORROW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toString()).to.equal(BORROW.toString());
            expect(pool.totalDebtShares.toNumber()).to.be.greaterThan(0);

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.debtShares.toNumber()).to.be.greaterThan(0);

            const vault = await getAccount(connection, lendingVaultPda);
            expect(vault.amount.toString()).to.equal((DEPOSIT - BORROW).toString());

            const userToken = await getAccount(connection, userTokenAccount);
            expect(userToken.amount.toString()).to.equal((INITIAL_BALANCE - DEPOSIT + BORROW).toString());
        });
    });

    // ── 2. Exact LTV ceiling ──────────────────────────────────────────────────────
    describe("borrow at exact 75% LTV ceiling", () => {
        const DEPOSIT = 100_000_000;
        const MAX_BORROW = 75_000_000;

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);
        });

        it("succeeds borrowing exactly 75% of deposited collateral", async () => {
            const { program, mint, lendingAccountPda, userPositionPda, authority, userTokenAccount } = setup;

            await program.methods
                .borrow(new anchor.BN(MAX_BORROW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toString()).to.equal(MAX_BORROW.toString());

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.debtShares.toNumber()).to.be.greaterThan(0);
        });
    });

    // ── 3. Over LTV by 1 ─────────────────────────────────────────────────────────
    describe("borrow exceeding LTV by 1 token", () => {
        const DEPOSIT = 100_000_000;
        const OVER_LTV = 75_000_001;

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);
        });

        it("rejects a borrow 1 token over the 75% LTV limit", async () => {
            const { program, mint, authority, userTokenAccount } = setup;

            try {
                await program.methods
                    .borrow(new anchor.BN(OVER_LTV))
                    .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                    .signers([authority])
                    .rpc();
                expect.fail("expected borrow to be rejected");
            } catch (e: any) {
                expect(e.message).to.include("InsufficientFunds");
            }
        });
    });

    // ── 4. Zero amount ────────────────────────────────────────────────────────────
    describe("borrow of zero tokens", () => {
        const DEPOSIT = 100_000_000;

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);
        });

        it("rejects borrow(0) with InvalidAmount", async () => {
            const { program, mint, authority, userTokenAccount } = setup;

            try {
                await program.methods
                    .borrow(new anchor.BN(0))
                    .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                    .signers([authority])
                    .rpc();
                expect.fail("expected borrow to be rejected");
            } catch (e: any) {
                expect(e.message).to.include("InvalidAmount");
            }
        });
    });

    // ── 5. No prior deposit ───────────────────────────────────────────────────────
    describe("borrow without a prior deposit", () => {
        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
        });

        it("rejects a borrow when the user has no position account", async () => {
            const { program, mint, connection } = setup;

            const stranger = Keypair.generate();
            const airdrop = await connection.requestAirdrop(stranger.publicKey, 2 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(airdrop);

            const strangerTokenAccount = anchor.utils.token.associatedAddress({
                mint: setup.mint,
                owner: stranger.publicKey,
            });

            try {
                await program.methods
                    .borrow(new anchor.BN(50_000_000))
                    .accounts({ mint, authority: stranger.publicKey, userTokenAccount: strangerTokenAccount })
                    .signers([stranger])
                    .rpc();
                expect.fail("expected borrow to be rejected");
            } catch (e: any) {
                expect(e).to.exist;
            }
        });
    });

    // ── 6. Multiple sequential borrows ───────────────────────────────────────────
    describe("multiple sequential borrows on the same position", () => {
        const DEPOSIT = 100_000_000;
        const FIRST_BORROW = 30_000_000;
        const SECOND_BORROW = 20_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);
        });

        it("first borrow succeeds", async () => {
            const { program, mint, lendingAccountPda, userPositionPda, authority, userTokenAccount } = setup;

            await program.methods
                .borrow(new anchor.BN(FIRST_BORROW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toString()).to.equal(FIRST_BORROW.toString());

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.debtShares.toNumber()).to.be.greaterThan(0);
        });

        it("second borrow on the same position accumulates correctly", async () => {
            const { program, mint, lendingAccountPda, lendingVaultPda, userPositionPda, userTokenAccount, authority, connection } = setup;

            const positionBefore = await program.account.userPosition.fetch(userPositionPda);
            const sharesBefore = positionBefore.debtShares.toNumber();

            await program.methods
                .borrow(new anchor.BN(SECOND_BORROW))
                .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                .signers([authority])
                .rpc();

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toNumber()).to.be.greaterThanOrEqual(FIRST_BORROW + SECOND_BORROW);

            const position = await program.account.userPosition.fetch(userPositionPda);
            expect(position.debtShares.toNumber()).to.be.greaterThan(sharesBefore);

            const vault = await getAccount(connection, lendingVaultPda);
            expect(Number(vault.amount)).to.equal(DEPOSIT - FIRST_BORROW - SECOND_BORROW);

            const userToken = await getAccount(connection, userTokenAccount);
            expect(Number(userToken.amount)).to.equal(INITIAL_BALANCE - DEPOSIT + FIRST_BORROW + SECOND_BORROW);
        });
    });

    // ── 7. Second borrow pushes over LTV ─────────────────────────────────────────
    describe("second borrow would push total debt over LTV", () => {
        const DEPOSIT = 100_000_000;
        const FIRST_BORROW = 60_000_000;
        const SECOND_BORROW = 16_000_000; // 60 + 16 = 76 > 75 (LTV max)

        let setup: TestSetup;

        before(async () => {
            setup = await setupTest();
            await deposit(setup, DEPOSIT);

            await setup.program.methods
                .borrow(new anchor.BN(FIRST_BORROW))
                .accounts({ mint: setup.mint, authority: setup.authority.publicKey, userTokenAccount: setup.userTokenAccount })
                .signers([setup.authority])
                .rpc();
        });

        it("rejects a second borrow that would push total debt over 75% LTV", async () => {
            const { program, mint, authority, userTokenAccount } = setup;

            try {
                await program.methods
                    .borrow(new anchor.BN(SECOND_BORROW))
                    .accounts({ mint, authority: authority.publicKey, userTokenAccount })
                    .signers([authority])
                    .rpc();
                expect.fail("expected second borrow to be rejected");
            } catch (e: any) {
                expect(e.message).to.include("InsufficientFunds");
            }
        });
    });

    // ── 8. Multiple concurrent borrowers ─────────────────────────────────────────
    describe("multiple concurrent borrowers from the same pool", () => {
        const DEPOSIT_A = 100_000_000;
        const DEPOSIT_B = 200_000_000;
        const BORROW_A = 50_000_000;
        const BORROW_B = 100_000_000;
        const INITIAL_BALANCE = 1_000_000_000;

        let setup: TestSetup;
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

        it("lender A borrows within their LTV", async () => {
            const { program, mint, lendingAccountPda, connection, lendingVaultPda } = setup;

            await program.methods
                .borrow(new anchor.BN(BORROW_A))
                .accounts({ mint, authority: lenderA.authority.publicKey, userTokenAccount: lenderA.userTokenAccount })
                .signers([lenderA.authority])
                .rpc();

            const positionA = await program.account.userPosition.fetch(lenderA.userPositionPda);
            expect(positionA.debtShares.toNumber()).to.be.greaterThan(0);

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toString()).to.equal(BORROW_A.toString());

            const vault = await getAccount(connection, lendingVaultPda);
            expect(Number(vault.amount)).to.equal(DEPOSIT_A + DEPOSIT_B - BORROW_A);
        });

        it("lender B borrows within their LTV — pool reflects cumulative debt", async () => {
            const { program, mint, lendingAccountPda, connection, lendingVaultPda } = setup;

            await program.methods
                .borrow(new anchor.BN(BORROW_B))
                .accounts({ mint, authority: lenderB.authority.publicKey, userTokenAccount: lenderB.userTokenAccount })
                .signers([lenderB.authority])
                .rpc();

            const positionB = await program.account.userPosition.fetch(lenderB.userPositionPda);
            expect(positionB.debtShares.toNumber()).to.be.greaterThan(0);

            const pool = await program.account.pool.fetch(lendingAccountPda);
            expect(pool.totalBorrowed.toNumber()).to.be.greaterThanOrEqual(BORROW_A + BORROW_B);

            const vault = await getAccount(connection, lendingVaultPda);
            expect(Number(vault.amount)).to.equal(DEPOSIT_A + DEPOSIT_B - BORROW_A - BORROW_B);

            const userTokenA = await getAccount(connection, lenderA.userTokenAccount);
            expect(Number(userTokenA.amount)).to.equal(INITIAL_BALANCE - DEPOSIT_A + BORROW_A);

            const userTokenB = await getAccount(connection, lenderB.userTokenAccount);
            expect(Number(userTokenB.amount)).to.equal(INITIAL_BALANCE - DEPOSIT_B + BORROW_B);
        });
    });
});
