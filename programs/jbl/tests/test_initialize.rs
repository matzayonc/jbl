use anchor_lang::prelude::Pubkey;
use jbl::state::Pool;
use {
    anchor_lang::{solana_program::instruction::Instruction, InstructionData, ToAccountMetas},
    anchor_spl::token::spl_token,
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

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

    // ── Create pool keypair and pre-allocate account ──────────────────────────
    let pool_keypair = Keypair::new();
    let pool_pubkey = pool_keypair.pubkey();

    let (pool_signer_pda, _) = Pubkey::find_program_address(
        &[b"pool_signer", pool_pubkey.as_ref()],
        &program_id,
    );
    let (vault_pda, _) = find_vault_pda(&pool_pubkey, &program_id);
    let (lp_mint_pda, _) = find_lp_mint_pda(&pool_pubkey, &program_id);

    // Pre-allocate pool account (too large for CPI creation)
    let pool_space = 8 + std::mem::size_of::<Pool>();
    let pool_rent = svm.minimum_balance_for_rent_exemption(pool_space);
    let create_pool_account_ix = anchor_lang::solana_program::system_instruction::create_account(
        &payer.pubkey(),
        &pool_pubkey,
        pool_rent,
        pool_space as u64,
        &program_id,
    );

    // ── Build create instruction ──────────────────────────────────────────────
    let instruction = Instruction::new_with_bytes(
        program_id,
        &jbl::instruction::Create { m1: 0, c1: 50, m2: 0, c2: 0 }.data(),
        jbl::accounts::Create {
            pool: pool_pubkey,
            pool_signer: pool_signer_pda,
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
    let msg = Message::new_with_blockhash(
        &[create_pool_account_ix, instruction],
        Some(&payer.pubkey()),
        &bh,
    );
    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(msg),
        &[&payer, &pool_keypair, &authority],
    )
    .unwrap();

    let res = svm.send_transaction(tx);
    assert!(res.is_ok(), "create failed: {:?}", res.err());
}

#[test]
fn test_pool_size() {
    // Pool layout (repr(C), no implicit padding):
    //   3 × Pubkey (32)       = 96
    //   5 × u64/i64 (8)       = 40
    //   fee_config 4×u64 (8)  = 32
    //   ltv_percent, bump, lp_mint_bump (1 each) = 3
    //   _pad [u8;5]            = 5
    //   WithdrawalQueue:
    //     head (u16) + tail (u16) + _pad [u8;4] = 8
    //     entries [WithdrawalQueueEntry; 1024], each 40 bytes = 40960
    //                                                 total = 41144
    assert_eq!(
        std::mem::size_of::<Pool>(),
        41144,
        "Pool size changed — update POOL_SPACE in create.rs and the TS test helper if intentional",
    );
}
