import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { expect } from "chai";
import { Jbl } from "../target/types/jbl";

describe("jbl", () => {
  // Configure the client to use the local cluster.
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Jbl as Program<Jbl>;
  const connection = provider.connection;

  describe("create_lending_account", () => {
    let authority: Keypair;
    let payer: Keypair;
    let lendingAccountPda: PublicKey;
    let bump: number;

    beforeEach(async () => {
      // Create fresh keypairs for each test
      authority = Keypair.generate();
      payer = Keypair.generate();

      // Airdrop SOL to accounts
      const airdropSignaturePayer = await connection.requestAirdrop(
        payer.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignaturePayer);

      const airdropSignatureAuthority = await connection.requestAirdrop(
        authority.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignatureAuthority);

      // Derive the PDA for the lending account
      [lendingAccountPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending"), authority.publicKey.toBuffer()],
        program.programId
      );
    });

    it("Creates a lending account successfully", async () => {
      // Execute the create_lending_account instruction
      const txSignature = await program.methods
        .createLendingAccount()
        .accounts({
          lendingAccount: lendingAccountPda,
          authority: authority.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer, authority])
        .rpc();

      // Confirm transaction
      await connection.confirmTransaction(txSignature);

      // Fetch the created account
      const lendingAccount = await program.account.lendingAccount.fetch(lendingAccountPda);

      // Verify the account data
      expect(lendingAccount.authority.toString()).to.equal(authority.publicKey.toString());
      expect(lendingAccount.totalDeposited.toString()).to.equal("0");
      expect(lendingAccount.totalBorrowed.toString()).to.equal("0");
      expect(lendingAccount.bump).to.equal(bump);

      // Verify that lastUpdateSlot is a reasonable value (greater than 0)
      expect(lendingAccount.lastUpdateSlot.toNumber()).to.be.greaterThan(0);

      console.log("✅ Lending account created successfully");
      console.log("Authority:", authority.publicKey.toString());
      console.log("Lending Account PDA:", lendingAccountPda.toString());
      console.log("Bump:", bump);
      console.log("Total Deposited:", lendingAccount.totalDeposited.toString());
      console.log("Total Borrowed:", lendingAccount.totalBorrowed.toString());
      console.log("Last Update Slot:", lendingAccount.lastUpdateSlot.toString());
    });

    it("Fails when trying to create duplicate lending account", async () => {
      // First creation should succeed
      await program.methods
        .createLendingAccount()
        .accounts({
          lendingAccount: lendingAccountPda,
          authority: authority.publicKey,
          payer: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer, authority])
        .rpc();

      // Second creation should fail
      try {
        await program.methods
          .createLendingAccount()
          .accounts({
            lendingAccount: lendingAccountPda,
            authority: authority.publicKey,
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([payer, authority])
          .rpc();

        // If we reach this line, the test should fail
        expect.fail("Expected transaction to fail but it succeeded");
      } catch (error) {
        // Verify it's the expected error (account already exists)
        expect(error.toString()).to.include("already in use");
      }
    });

    it("Derives consistent PDA addresses", async () => {
      // Derive PDA multiple times with same inputs
      const [pda1] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending"), authority.publicKey.toBuffer()],
        program.programId
      );

      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending"), authority.publicKey.toBuffer()],
        program.programId
      );

      expect(pda1.toString()).to.equal(pda2.toString());
      expect(pda1.toString()).to.equal(lendingAccountPda.toString());

      // Different authority should produce different PDA
      const differentAuthority = Keypair.generate();
      const [differentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending"), differentAuthority.publicKey.toBuffer()],
        program.programId
      );

      expect(differentPda.toString()).to.not.equal(lendingAccountPda.toString());
    });
  });
});