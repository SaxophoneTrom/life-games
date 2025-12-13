// EpochArchiveNFT コントラクトABI（必要な関数のみ抽出）
// Contract Address: 0xC1F4eC40B0DCdA6323498ac90E72499Bdfee0F72 (Base Sepolia)
// Updated: 2025-12-19 v6 - トークン名変更版

export const EPOCH_ARCHIVE_NFT_ABI = [
  // View: getEpoch
  {
    type: 'function',
    name: 'getEpoch',
    inputs: [{ name: 'epochId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct EpochArchiveNFT.Epoch',
        components: [
          { name: 'absStartGen', type: 'uint256', internalType: 'uint256' },
          { name: 'absEndGen', type: 'uint256', internalType: 'uint256' },
          { name: 'startStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startStateCID', type: 'string', internalType: 'string' },
          { name: 'endStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'endStateCID', type: 'string', internalType: 'string' },
          { name: 'artifactURI', type: 'string', internalType: 'string' },
          { name: 'metadataURI', type: 'string', internalType: 'string' },
          { name: 'contributorsCID', type: 'string', internalType: 'string' },
          { name: 'contributorsRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'endBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'revealed', type: 'bool', internalType: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  // View: lastMintedEpochId
  {
    type: 'function',
    name: 'lastMintedEpochId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: mintPrice
  {
    type: 'function',
    name: 'mintPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: GENERATIONS_PER_EPOCH
  {
    type: 'function',
    name: 'GENERATIONS_PER_EPOCH',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: getEpochIdFromGeneration
  {
    type: 'function',
    name: 'getEpochIdFromGeneration',
    inputs: [{ name: 'generation', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'pure',
  },
  // View: getEpochs (pagination)
  {
    type: 'function',
    name: 'getEpochs',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: 'epochIds', type: 'uint256[]', internalType: 'uint256[]' },
      {
        name: 'epochList',
        type: 'tuple[]',
        internalType: 'struct EpochArchiveNFT.Epoch[]',
        components: [
          { name: 'absStartGen', type: 'uint256', internalType: 'uint256' },
          { name: 'absEndGen', type: 'uint256', internalType: 'uint256' },
          { name: 'startStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startStateCID', type: 'string', internalType: 'string' },
          { name: 'endStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'endStateCID', type: 'string', internalType: 'string' },
          { name: 'artifactURI', type: 'string', internalType: 'string' },
          { name: 'metadataURI', type: 'string', internalType: 'string' },
          { name: 'contributorsCID', type: 'string', internalType: 'string' },
          { name: 'contributorsRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'endBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'revealed', type: 'bool', internalType: 'bool' },
        ],
      },
      { name: 'total', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  // View: contributorClaimed
  {
    type: 'function',
    name: 'contributorClaimed',
    inputs: [
      { name: 'epochId', type: 'uint256', internalType: 'uint256' },
      { name: 'user', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  // View: checkContributorStatus
  {
    type: 'function',
    name: 'checkContributorStatus',
    inputs: [
      { name: 'epochId', type: 'uint256', internalType: 'uint256' },
      { name: 'user', type: 'address', internalType: 'address' },
      { name: 'segmentTokenIds', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    outputs: [
      { name: 'isContributor', type: 'bool', internalType: 'bool' },
      { name: 'eligibleSegmentId', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  // View: balanceOf (ERC1155)
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' },
      { name: 'id', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: uri (ERC1155)
  {
    type: 'function',
    name: 'uri',
    inputs: [{ name: 'epochId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  // Write: collect
  {
    type: 'function',
    name: 'collect',
    inputs: [{ name: 'epochId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  // Write: collectAsContributor
  {
    type: 'function',
    name: 'collectAsContributor',
    inputs: [
      { name: 'epochId', type: 'uint256', internalType: 'uint256' },
      { name: 'segmentTokenId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Write: mintEpoch (epochMinter only - for GitHub Actions)
  {
    type: 'function',
    name: 'mintEpoch',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct EpochArchiveNFT.MintEpochParams',
        components: [
          { name: 'epochId', type: 'uint256', internalType: 'uint256' },
          { name: 'startStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startStateCID', type: 'string', internalType: 'string' },
          { name: 'endStateRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'endStateCID', type: 'string', internalType: 'string' },
          { name: 'artifactURI', type: 'string', internalType: 'string' },
          { name: 'metadataURI', type: 'string', internalType: 'string' },
          { name: 'contributorsCID', type: 'string', internalType: 'string' },
          { name: 'contributorsRoot', type: 'bytes32', internalType: 'bytes32' },
          { name: 'startBlock', type: 'uint256', internalType: 'uint256' },
          { name: 'endBlock', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'EpochMinted',
    inputs: [
      { name: 'epochId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'absStartGen', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'absEndGen', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'startBlock', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'endBlock', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'artifactURI', type: 'string', indexed: false, internalType: 'string' },
      { name: 'contributorsCID', type: 'string', indexed: false, internalType: 'string' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'EpochCollected',
    inputs: [
      { name: 'epochId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'collector', type: 'address', indexed: true, internalType: 'address' },
      { name: 'isContributor', type: 'bool', indexed: false, internalType: 'bool' },
    ],
    anonymous: false,
  },
] as const;
