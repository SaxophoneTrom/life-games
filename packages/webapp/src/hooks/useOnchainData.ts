'use client';

import { useQuery } from '@tanstack/react-query';
import type { Segment, Epoch, Cell } from '@/types';

// ===========================================
// API Response Types
// ===========================================

interface SegmentListResponse {
  segments: {
    tokenId: number;
    minter: string;
    fid: number;
    nGenerations: number;
    cellsHash: string;
    mintedAt: number;
    blockNumber: number;
  }[];
  total: number;
  totalGenerations: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface SegmentDetailResponse {
  tokenId: number;
  minter: string;
  fid: number;
  nGenerations: number;
  cellsHash: string;
  mintedAt: number;
  blockNumber: number;
  cells: Cell[];
  owner: string;
}

interface EpochListResponse {
  epochs: {
    epochId: number;
    absStartGen: number;
    absEndGen: number;
    startBlock: number;
    endBlock: number;
    artifactURI: string;
    contributorsCID: string;
    revealed: boolean;
  }[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  lastMintedEpochId: number;
}

interface EpochDetailResponse {
  epochId: number;
  absStartGen: number;
  absEndGen: number;
  startStateRoot: string;
  startStateCID: string;
  endStateRoot: string;
  endStateCID: string;
  artifactURI: string;
  metadataURI: string;
  contributorsCID: string;
  contributorsRoot: string;
  startBlock: number;
  endBlock: number;
  revealed: boolean;
  mintPrice: string;
}

// ===========================================
// Fetch Functions
// ===========================================

async function fetchSegments(
  limit: number = 50,
  offset: number = 0,
  fid?: number
): Promise<SegmentListResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (fid !== undefined) {
    params.set('fid', fid.toString());
  }

  const response = await fetch(`/api/segments?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch segments');
  }
  return response.json();
}

async function fetchSegment(id: number): Promise<SegmentDetailResponse> {
  const response = await fetch(`/api/segments/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Segment not found');
    }
    throw new Error('Failed to fetch segment');
  }
  return response.json();
}

async function fetchEpochs(
  limit: number = 50,
  offset: number = 0
): Promise<EpochListResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`/api/epochs?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch epochs');
  }
  return response.json();
}

async function fetchEpoch(id: number): Promise<EpochDetailResponse> {
  const response = await fetch(`/api/epochs/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Epoch not found');
    }
    throw new Error('Failed to fetch epoch');
  }
  return response.json();
}

// ===========================================
// Transform Functions
// ===========================================

function transformToSegment(
  data: SegmentListResponse['segments'][0]
): Segment {
  return {
    id: data.tokenId,
    tokenId: data.tokenId,
    minter: data.minter,
    fid: data.fid,
    nGenerations: data.nGenerations,
    injectedCells: [], // 一覧では取得しない
    cellsHash: data.cellsHash,
    mintedAt: data.mintedAt,
    createdAt: new Date(data.blockNumber * 1000), // 概算
  };
}

function transformToSegmentDetail(data: SegmentDetailResponse): Segment {
  return {
    id: data.tokenId,
    tokenId: data.tokenId,
    minter: data.minter,
    fid: data.fid,
    nGenerations: data.nGenerations,
    injectedCells: data.cells,
    cellsHash: data.cellsHash,
    mintedAt: data.mintedAt,
    createdAt: new Date(data.blockNumber * 1000),
  };
}

function transformToEpoch(
  data: EpochListResponse['epochs'][0]
): Epoch {
  return {
    id: data.epochId,
    tokenId: data.epochId,
    absStartGen: data.absStartGen,
    absEndGen: data.absEndGen,
    startStateRoot: '',
    startStateCID: '',
    endStateRoot: '',
    endStateCID: '',
    artifactURI: data.artifactURI,
    metadataURI: '',
    contributorsCID: data.contributorsCID,
    contributorsRoot: '',
    startBlock: data.startBlock,
    endBlock: data.endBlock,
    revealed: data.revealed,
  };
}

function transformToEpochDetail(data: EpochDetailResponse): Epoch {
  return {
    id: data.epochId,
    tokenId: data.epochId,
    absStartGen: data.absStartGen,
    absEndGen: data.absEndGen,
    startStateRoot: data.startStateRoot,
    startStateCID: data.startStateCID,
    endStateRoot: data.endStateRoot,
    endStateCID: data.endStateCID,
    artifactURI: data.artifactURI,
    metadataURI: data.metadataURI,
    contributorsCID: data.contributorsCID,
    contributorsRoot: data.contributorsRoot,
    startBlock: data.startBlock,
    endBlock: data.endBlock,
    revealed: data.revealed,
  };
}

// ===========================================
// Hooks
// ===========================================

/**
 * セグメント一覧を取得
 */
export function useSegments(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['segments', limit, offset],
    queryFn: () => fetchSegments(limit, offset),
    select: (data) => ({
      segments: data.segments.map(transformToSegment),
      total: data.total,
      totalGenerations: data.totalGenerations,
      hasMore: data.hasMore,
    }),
  });
}

/**
 * 特定FIDのセグメント一覧を取得
 */
export function useSegmentsByFid(
  fid: number | undefined,
  limit: number = 50,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['segments', 'fid', fid, limit, offset],
    queryFn: () => fetchSegments(limit, offset, fid),
    enabled: fid !== undefined,
    select: (data) => ({
      segments: data.segments.map(transformToSegment),
      total: data.total,
      hasMore: data.hasMore,
    }),
  });
}

/**
 * セグメント詳細を取得
 */
export function useSegment(id: number | undefined) {
  return useQuery({
    queryKey: ['segment', id],
    queryFn: () => fetchSegment(id!),
    enabled: id !== undefined,
    select: transformToSegmentDetail,
  });
}

/**
 * エポック一覧を取得
 */
export function useEpochs(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: ['epochs', limit, offset],
    queryFn: () => fetchEpochs(limit, offset),
    select: (data) => ({
      epochs: data.epochs.map(transformToEpoch),
      total: data.total,
      hasMore: data.hasMore,
      lastMintedEpochId: data.lastMintedEpochId,
    }),
  });
}

/**
 * エポック詳細を取得
 */
export function useEpoch(id: number | undefined) {
  return useQuery({
    queryKey: ['epoch', id],
    queryFn: () => fetchEpoch(id!),
    enabled: id !== undefined,
    select: transformToEpochDetail,
  });
}
