use anchor_lang::prelude::Pubkey;
use {
    anchor_lang::{solana_program::instruction::Instruction, InstructionData, ToAccountMetas},
    anchor_spl::token::spl_token,
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn find_pool_pda(authority: &Pubkey, mint: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"lending", authority.as_ref(), mint.as_ref()], program_id)
}

fn find_vault_pda(pool: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"pool", pool.as_ref()], program_id)
}

fn find_lp_mint_pda(pool: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"lp_mint", pool.as_ref()], program_id)
}

#[test]
fn test_create() {
    let program_id = jbl::id();
    let payer = Keypair::new();
    let authority = Keypair::new();
    let mint_keypair = Keypair::new();

    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/jbl.so");
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    // ── Create the SPL mint ───────────────────────────────────────────────────
    let mint_rent = svm.minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN);
    use anchor_lang::solana_program::program_pack::Pack;
    let create_account_ix = anchor_lang::solana_program::system_instruction::create_account(
        &payer.pubkey(),
        &mint_keypair.pubkey(),
        mint_rent,
        spl_token::state::Mint::LEN as u64,
        &spl_token::id(),
    );
    let init_mint_ix = spl_token::instruction::initialize_mint(
        &spl_token::id(),
        &mint_keypair.pubkey(),
        &payer.pubkey(),
        None,
        6,
    )
    .unwrap();

    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(
        &[create_account_ix, init_mint_ix],
        Some(&payer.pubkey()),
        &bh,
    );
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer, &mint_keypair])
        .unwrap();
    svm.send_transaction(tx).unwrap();

    // ── Derive PDAs ───────────────────────────────────────────────────────────
    let (pool_pda, _) = find_pool_pda(&authority.pubkey(), &mint_keypair.pubkey(), &program_id);
    let (vault_pda, _) = find_vault_pda(&pool_pda, &program_id);
    let (lp_mint_pda, _) = find_lp_mint_pda(&pool_pda, &program_id);

    // ── Build create instruction ──────────────────────────────────────────────
    let instruction = Instruction::new_with_bytes(
        program_id,
        &jbl::instruction::Create { borrow_fee_bps: 50 }.data(),
        jbl::accounts::Create {
            pool: pool_pda,
            vault: vault_pda,
            lp_mint: lp_mint_pda,
            mint: mint_keypair.pubkey(),
            authority: authority.pubkey(),
            payer: payer.pubkey(),
            token_program: spl_token::id(),
            system_program: anchor_lang::solana_program::system_program::id(),
        }
        .to_account_metas(None),
    );

    let bh = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[instruction], Some(&payer.pubkey()), &bh);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[&payer, &authority])
        .unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "create failed: {:?}", res.err());
}
