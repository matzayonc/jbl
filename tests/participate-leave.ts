import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider, BN } from "@anchor-lang/core";
import {
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
} from "@solana/web3.js";
import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { Jbl } from "../target/types/jbl";

/** 8-byte discriminant + Vault struct (3 Pubkeys + u64 + 8-byte pad + WithdrawalQueue) */
const VAULT_SPACE = 8 + 3 * 32 + 8 + 8 + (2 + 2 + 4 + 1024 * 40);

const PARTICIPATE_AMOUNT = 1_000_000;

/**
 * Shared setup for all participate/leave tests.
 * Creates a vault whose lp_mint has the `state` PDA as mint authority so the
 * program can mint LP tokens during `participate`.
 */
async function setupVault() {
    const provider = AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Jbl as Program<Jbl>;
    const connection = provider.connection;

    const payer = Keypair.generate();
    const authority = Keypair.generate();
    const vaultKeypair = Keypair.generate();

    for (const kp of [payer, authority]) {
        const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
    }

    // Derive the state PDA — this must be the mint authority for lpMint so the
    // program can mint LP tokens inside `participate`.
    const [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        program.programId
    );

    // lentMint: authority holds it so we can mintTo the user later.
    const lentMint = await createMint(
        connection,
        payer,
        authority.publicKey,
        null,
        6
    );

    // lpMint: created by create_vault as a PDA with seeds ["lp_mint", vault].
    const [lpMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), vaultKeypair.publicKey.toBuffer()],
        program.programId
    );

    // Derive vault PDA seeds used by the program.
    const [vaultTokenAccountAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_tokens_a"), vaultKeypair.publicKey.toBuffer()],
        program.programId
    );

    // Pre-allocate vault keypair account (too large for on-chain CPI allocation).
    const vaultRent = await connection.getMinimumBalanceForRentExemption(VAULT_SPACE);
    const createVaultAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: vaultKeypair.publicKey,
        lamports: vaultRent,
        space: VAULT_SPACE,
        programId: program.programId,
    });

    await program.methods
        .createVault()
        .accounts({
            vault: vaultKeypair.publicKey,
            lentMint,
            authority: authority.publicKey,
            payer: payer.publicKey,
        })
        .preInstructions([createVaultAccountIx])
        .signers([payer, authority, vaultKeypair])
        .rpc();

    // Mint lent tokens to user (authority) so they can participate.
    const userLentTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        lentMint,
        authority.publicKey
    );

    await mintTo(
        connection,
        payer,
        lentMint,
        userLentTokenAccount.address,
        authority,
        10_000_000 // 10 tokens (6 decimals) — enough for all test cases
    );

    return {
        provider,
        program,
        connection,
        payer,
        authority,
        lentMint,
        lpMint,
        statePda,
        vault: vaultKeypair.publicKey,
        vaultTokenAccountAPda,
        userLentTokenAccount: userLentTokenAccount.address,
    };
}

describe("participate and leave", () => {
    // ── 1. Happy path: participate ──────────────────────────────────────────────
    describe("participate with 1_000_000 lent tokens", () => {
        let ctx: Awaited<ReturnType<typeof setupVault>>;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            ctx = await setupVault();

            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: ctx.lpMint,
                owner: ctx.authority.publicKey,
            });
        });

        it("mints LP tokens equal to amount on first deposit", async () => {
            const { program, connection, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            await program.methods
                .participate(new BN(PARTICIPATE_AMOUNT))
                .accounts({
                    vault,
                    lentMint,
                    authority: authority.publicKey,
                    userLentTokenAccount,
                })
                .signers([authority])
                .rpc();

            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
        });

        it("increases vault token balance by the deposited amount", async () => {
            const { connection, vaultTokenAccountAPda } = ctx;
            const vaultToken = await getAccount(connection, vaultTokenAccountAPda);
            expect(vaultToken.amount.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
        });

        it("increments vault.total_shares by the minted LP amount", async () => {
            const { program, vault } = ctx;
            const vaultAccount = await program.account.vault.fetch(vault);
            expect(vaultAccount.totalShares.toString()).to.equal(PARTICIPATE_AMOUNT.toString());
        });
    });

    // ── 2. Happy path: leave (full redemption) ──────────────────────────────────
    describe("leave with all shares after participating", () => {
        let ctx: Awaited<ReturnType<typeof setupVault>>;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            ctx = await setupVault();

            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: ctx.lpMint,
                owner: ctx.authority.publicKey,
            });

            // Participate first so there are shares to leave with.
            const { program, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            await program.methods
                .participate(new BN(PARTICIPATE_AMOUNT))
                .accounts({
                    vault,
                    lentMint,
                    authority: authority.publicKey,
                    userLentTokenAccount,
                })
                .signers([authority])
                .rpc();
        });

        it("returns all lent tokens to the user and burns LP tokens", async () => {
            const { program, connection, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            const lentBefore = await getAccount(connection, userLentTokenAccount);
            const lentBalanceBefore = lentBefore.amount;

            await program.methods
                .leave(new BN(PARTICIPATE_AMOUNT))
                .accounts({
                    vault,
                    lentMint,
                    authority: authority.publicKey,
                })
                .signers([authority])
                .rpc();

            const lentAfter = await getAccount(connection, userLentTokenAccount);
            expect((lentAfter.amount - lentBalanceBefore).toString()).to.equal(PARTICIPATE_AMOUNT.toString());

            const lpAccount = await getAccount(connection, userLpTokenAccount);
            expect(lpAccount.amount.toString()).to.equal("0");
        });

        it("sets vault.total_shares to 0 after full redemption", async () => {
            const { program, vault } = ctx;
            const vaultAccount = await program.account.vault.fetch(vault);
            expect(vaultAccount.totalShares.toString()).to.equal("0");
        });

        it("empties the vault token account after full redemption", async () => {
            const { connection, vaultTokenAccountAPda } = ctx;
            const vaultToken = await getAccount(connection, vaultTokenAccountAPda);
            expect(vaultToken.amount.toString()).to.equal("0");
        });
    });

    // ── 3. Error: leave with 0 shares ───────────────────────────────────────────
    describe("leave with 0 shares", () => {
        let ctx: Awaited<ReturnType<typeof setupVault>>;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            ctx = await setupVault();

            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: ctx.lpMint,
                owner: ctx.authority.publicKey,
            });

            // Participate so the LP ATA exists on-chain (leave needs it to exist).
            const { program, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            await program.methods
                .participate(new BN(PARTICIPATE_AMOUNT))
                .accounts({
                    vault,
                    lentMint,
                    authority: authority.publicKey,
                    userLentTokenAccount,
                })
                .signers([authority])
                .rpc();
        });

        it("fails with InvalidAmount when shares = 0", async () => {
            const { program, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            try {
                await program.methods
                    .leave(new BN(0))
                    .accounts({
                        vault,
                        lentMint,
                        authority: authority.publicKey,
                    })
                    .signers([authority])
                    .rpc();
                expect.fail("Expected leave(0) to fail with InvalidAmount");
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.include("InvalidAmount");
            }
        });
    });

    // ── 4. Error: leave with more shares than balance ───────────────────────────
    describe("leave with more shares than LP balance", () => {
        let ctx: Awaited<ReturnType<typeof setupVault>>;
        let userLpTokenAccount: PublicKey;

        before(async () => {
            ctx = await setupVault();

            userLpTokenAccount = anchor.utils.token.associatedAddress({
                mint: ctx.lpMint,
                owner: ctx.authority.publicKey,
            });

            // Participate so the LP ATA exists on-chain with a known balance.
            const { program, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;

            await program.methods
                .participate(new BN(PARTICIPATE_AMOUNT))
                .accounts({
                    vault,
                    lentMint,
                    authority: authority.publicKey,
                    userLentTokenAccount,
                })
                .signers([authority])
                .rpc();
        });

        it("fails with InsufficientFunds when shares exceed LP balance", async () => {
            const { program, authority, lentMint, lpMint, statePda, vault, vaultTokenAccountAPda, userLentTokenAccount } = ctx;
            const tooManyShares = PARTICIPATE_AMOUNT + 1;

            try {
                await program.methods
                    .leave(new BN(tooManyShares))
                    .accounts({
                        vault,
                        lentMint,
                        authority: authority.publicKey,
                    })
                    .signers([authority])
                    .rpc();
                expect.fail("Expected leave with excess shares to fail with InsufficientFunds");
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(Error);
                expect((err as Error).message).to.include("InsufficientFunds");
            }
        });
    });
});
