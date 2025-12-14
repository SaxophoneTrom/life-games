// ============================================
// 多言語対応 - 翻訳データ
// ============================================

export type Language = 'en' | 'ja';

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    buy: 'Buy',
    gallery: 'Gallery',
    my_page: 'My',

    // Home
    join_now: 'Join Now',
    generation: 'Generation',
    generations: 'Generations',
    total_segments: 'Total Segments',
    latest_segments: 'Latest Segments',

    // Buy
    purchase: 'Purchase',
    preview: 'Preview',
    price: 'Price',
    cells: 'Cells',
    max: 'max',
    tap_to_place: 'Tap to place cells',
    select_color: 'Select Color',
    clear_cells: 'Clear',

    // Segment
    pending: 'Pending',
    revealed: 'Revealed',
    in_progress: 'In Progress',
    status: 'Status',
    injected_cells: 'Injected Cells',
    creator: 'Creator',
    share_on_farcaster: 'Share on Farcaster',
    segment: 'Segment',

    // Epoch
    epoch: 'Epoch',
    mint_nft: 'Mint NFT',
    mint_price: 'Mint Price',
    no_epochs: 'No epochs yet',

    // My Page
    my_segments: 'My Segments',
    free_mint_available: 'Free Mint Available',
    claim_free_nft: 'Claim Free NFT',
    you_contributed: 'You contributed!',
    my_epoch_nfts: 'My Epoch NFTs',
    no_segments: 'No segments yet',

    // Gallery
    segments: 'Segments',
    epochs: 'Epochs',

    // Common
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    connect_wallet: 'Connect Wallet',
    insufficient_funds: 'Insufficient funds',
    transaction_pending: 'Transaction pending...',
    transaction_success: 'Transaction successful!',
    transaction_failed: 'Transaction failed',
  },
  ja: {
    // Navigation
    home: 'ホーム',
    buy: '購入',
    gallery: 'ギャラリー',
    my_page: 'マイ',

    // Home
    join_now: '参加する',
    generation: '世代',
    generations: '世代数',
    total_segments: '総セグメント数',
    latest_segments: '最新セグメント',

    // Buy
    purchase: '購入する',
    preview: 'プレビュー',
    price: '価格',
    cells: 'セル',
    max: '最大',
    tap_to_place: 'タップしてセルを配置',
    select_color: '色を選択',
    clear_cells: 'クリア',

    // Segment
    pending: '処理中',
    revealed: '公開済み',
    in_progress: '進行中',
    status: 'ステータス',
    injected_cells: '注入セル数',
    creator: '作成者',
    share_on_farcaster: 'Farcasterでシェア',
    segment: 'セグメント',

    // Epoch
    epoch: 'エポック',
    mint_nft: 'NFTをミント',
    mint_price: 'ミント価格',
    no_epochs: 'エポックがありません',

    // My Page
    my_segments: 'マイセグメント',
    free_mint_available: '無料ミント可能',
    claim_free_nft: '無料NFTを受け取る',
    you_contributed: 'あなたは貢献しました！',
    my_epoch_nfts: 'マイエポックNFT',
    no_segments: 'セグメントがありません',

    // Gallery
    segments: 'セグメント',
    epochs: 'エポック',

    // Common
    loading: '読み込み中...',
    error: 'エラー',
    retry: '再試行',
    connect_wallet: 'ウォレット接続',
    insufficient_funds: '残高不足',
    transaction_pending: 'トランザクション処理中...',
    transaction_success: 'トランザクション成功！',
    transaction_failed: 'トランザクション失敗',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
