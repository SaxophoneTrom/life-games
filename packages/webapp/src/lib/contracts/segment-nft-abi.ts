// SegmentNFT コントラクトABI（必要な関数のみ抽出）
// Contract Address: 0xACF68f1cC38FEf3fdf6f784D3011FE7F2C146D75 (Base Sepolia)
// Updated: 2025-12-17 - Added getSegments, getSegmentsByOwner, totalSupply

export const SEGMENT_NFT_ABI = [
  // View: getSegment
  {
    type: 'function',
    name: 'getSegment',
    inputs: [{ name: 'tokenId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct SegmentNFT.Segment',
        components: [
          { name: 'minter', type: 'address', internalType: 'address' },
          { name: 'fid', type: 'uint256', internalType: 'uint256' },
          { name: 'nGenerations', type: 'uint8', internalType: 'uint8' },
          { name: 'cellsHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'mintedAt', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  // View: ownerOf (ERC721)
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  // View: tokenURI (ERC721)
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  // View: nextTokenId
  {
    type: 'function',
    name: 'nextTokenId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: totalSupply
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: getSegments (pagination, newest first)
  {
    type: 'function',
    name: 'getSegments',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: 'tokenIds', type: 'uint256[]', internalType: 'uint256[]' },
      {
        name: 'segmentList',
        type: 'tuple[]',
        internalType: 'struct SegmentNFT.Segment[]',
        components: [
          { name: 'minter', type: 'address', internalType: 'address' },
          { name: 'fid', type: 'uint256', internalType: 'uint256' },
          { name: 'nGenerations', type: 'uint8', internalType: 'uint8' },
          { name: 'cellsHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'mintedAt', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'total', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  // View: getSegmentsByOwner (pagination, newest first)
  {
    type: 'function',
    name: 'getSegmentsByOwner',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      { name: 'tokenIds', type: 'uint256[]', internalType: 'uint256[]' },
      {
        name: 'segmentList',
        type: 'tuple[]',
        internalType: 'struct SegmentNFT.Segment[]',
        components: [
          { name: 'minter', type: 'address', internalType: 'address' },
          { name: 'fid', type: 'uint256', internalType: 'uint256' },
          { name: 'nGenerations', type: 'uint8', internalType: 'uint8' },
          { name: 'cellsHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'mintedAt', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'total', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  // View: calculateFee
  {
    type: 'function',
    name: 'calculateFee',
    inputs: [
      { name: 'nGenerations', type: 'uint8', internalType: 'uint8' },
      { name: 'cellCount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: baseFee, perGenFee, perCellFee
  {
    type: 'function',
    name: 'baseFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'perGenFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'perCellFee',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  // View: minGenerations, maxGenerations
  {
    type: 'function',
    name: 'minGenerations',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxGenerations',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  // Write: mintSegment
  {
    type: 'function',
    name: 'mintSegment',
    inputs: [
      { name: 'nGenerations', type: 'uint8', internalType: 'uint8' },
      { name: 'cellsEncoded', type: 'bytes', internalType: 'bytes' },
      { name: 'fid', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'payable',
  },
  // Events
  {
    type: 'event',
    name: 'SegmentMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'minter', type: 'address', indexed: true, internalType: 'address' },
      { name: 'fid', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'nGenerations', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'cellsHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SegmentCells',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'cellsEncoded', type: 'bytes', indexed: false, internalType: 'bytes' },
    ],
    anonymous: false,
  },
] as const;
