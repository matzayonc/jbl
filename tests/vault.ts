import * as anchor from "@anchor-lang/core";
import { Program, AnchorProvider, BN } from "@anchor-lang/core";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { createMint, getAccount } from "@solana/spl-token";
import { expect } from "chai";
import { Jbl } from "../target/types/jbl";

/** 8-byte discriminant + Vault struct (3 Pubkeys + u64 + 8-byte pad + WithdrawalQueue) */
const VAULT_SPACE = 8 + 3 * 32 + 8 + 8 + (2 + 2 + 4 + 1024 * 40);

describe("vault", () => {
    describe("create_vault", () => {
        let provider: AnchorProvider;
        let program: Program<Jbl>;
        let payer: Keypair;
        let authority: Keypair;
        let lentMint: PublicKey;
        let lpMintPda: PublicKey;
        let vaultKeypair: Keypair;
        let vaultTokenAccountAPda: PublicKey;
        let statePda: PublicKey;

        before(async () => {
            provider = AnchorProvider.env();
            anchor.setProvider(provider);
            program = anchor.workspace.Jbl as Program<Jbl>;

            payer = Keypair.generate();
            authority = Keypair.generate();
            vaultKeypair = Keypair.generate();

            // Airdrop SOL
            for (const kp of [payer, authority]) {
                const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
                await provider.connection.confirmTransaction(sig);
            }

            // Create the lent mint (external — not owned by the program)
            lentMint = await createMint(provider.connection, payer, authority.publicKey, null, 6);

            // Derive PDAs
            [statePda] = PublicKey.findProgramAddressSync(
                [Buffer.from("state")],
                program.programId
            );

            [vaultTokenAccountAPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault_tokens_a"), vaultKeypair.publicKey.toBuffer()],
                program.programId
            );

            // lp_mint is created by create_vault as a PDA; derive it here for assertions.
            [lpMintPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("lp_mint"), vaultKeypair.publicKey.toBuffer()],
                program.programId
            );
        });

        it("creates vault account with correct state", async () => {
            // Pre-allocate the vault account (keypair, not PDA) — mirrors Pool pattern.
            const vaultRent = await provider.connection.getMinimumBalanceForRentExemption(VAULT_SPACE);
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

            const vault = await program.account.vault.fetch(vaultKeypair.publicKey);

            expect(vault.authority.toString()).to.equal(authority.publicKey.toString());
            expect(vault.lentMint.toString()).to.equal(lentMint.toString());
            expect(vault.lpMint.toString()).to.equal(lpMintPda.toString());
            expect(vault.totalShares.toString()).to.equal("0");
        });

        it("initialises vault_token_account_a under state authority", async () => {
            const tokenAccount = await getAccount(provider.connection, vaultTokenAccountAPda);

            expect(tokenAccount.mint.toString()).to.equal(lentMint.toString());
            expect(tokenAccount.owner.toString()).to.equal(statePda.toString());
            expect(tokenAccount.amount.toString()).to.equal("0");
        });

        it("fails when vault account is already initialised", async () => {
            try {
                await program.methods
                    .createVault()
                    .accounts({
                        vault: vaultKeypair.publicKey,
                        lentMint,
                        authority: authority.publicKey,
                        payer: payer.publicKey,
                    })
                    .signers([payer, authority])
                    .rpc();
                expect.fail("Expected second create_vault to fail");
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(Error);
            }
        });
    });
});
