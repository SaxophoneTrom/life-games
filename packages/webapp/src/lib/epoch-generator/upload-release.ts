// ============================================
// Epoch Generator - GitHub Releaseへのアップロード
// ============================================

import { ContributorsJson } from './types';

// 環境変数
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface Release {
  id: number;
  tag_name: string;
  upload_url: string;
  assets: ReleaseAsset[];
}

/**
 * GitHub Releaseを作成または取得
 */
async function getOrCreateRelease(tagName: string): Promise<Release> {
  const [owner, repo] = GITHUB_REPO.split('/');

  // 既存のReleaseを確認
  const checkResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (checkResponse.ok) {
    return checkResponse.json();
  }

  // Releaseが存在しない場合は作成
  const createResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: `Epoch Artifacts - ${tagName}`,
        body: `Generated epoch artifacts for ${tagName}`,
        draft: false,
        prerelease: false,
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create release: ${error}`);
  }

  return createResponse.json();
}

/**
 * Releaseにアセットをアップロード
 */
async function uploadAsset(
  release: Release,
  filename: string,
  content: Buffer | string,
  contentType: string
): Promise<string> {
  const [owner, repo] = GITHUB_REPO.split('/');

  // 既存のアセットを削除（同名ファイルがある場合）
  const existingAsset = release.assets.find((a) => a.name === filename);
  if (existingAsset) {
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.name}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
  }

  // upload_urlから{?name,label}を削除
  const uploadUrl = release.upload_url.replace('{?name,label}', '');

  // アップロード
  // Node.js fetch互換のためにany型でキャスト
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await fetch(`${uploadUrl}?name=${filename}`, {
    method: 'POST',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': contentType,
    },
    body: content as any,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload asset: ${error}`);
  }

  const asset = (await response.json()) as ReleaseAsset;
  return asset.browser_download_url;
}

/**
 * Epoch GIFをGitHub Releaseにアップロード
 *
 * @param epochId Epoch ID
 * @param gifBuffer GIF画像のBuffer
 * @returns アップロードされたGIFのURL
 */
export async function uploadEpochGif(
  epochId: number,
  gifBuffer: Buffer
): Promise<string> {
  const tagName = `epoch-${epochId}`;
  const filename = `epoch-${epochId}.gif`;

  console.log(`Uploading GIF to GitHub Release: ${tagName}/${filename}`);

  const release = await getOrCreateRelease(tagName);
  const url = await uploadAsset(release, filename, gifBuffer, 'image/gif');

  console.log(`GIF uploaded: ${url}`);
  return url;
}

/**
 * Contributors JSONをGitHub Releaseにアップロード
 *
 * @param epochId Epoch ID
 * @param contributors Contributors JSON
 * @returns アップロードされたJSONのURL
 */
export async function uploadContributorsJson(
  epochId: number,
  contributors: ContributorsJson
): Promise<string> {
  const tagName = `epoch-${epochId}`;
  const filename = `epoch-${epochId}-contributors.json`;

  console.log(`Uploading contributors JSON to GitHub Release: ${tagName}/${filename}`);

  const release = await getOrCreateRelease(tagName);
  const content = JSON.stringify(contributors, null, 2);
  const url = await uploadAsset(release, filename, content, 'application/json');

  console.log(`Contributors JSON uploaded: ${url}`);
  return url;
}

/**
 * Epoch MetadataをGitHub Releaseにアップロード
 *
 * @param epochId Epoch ID
 * @param metadata NFTメタデータ
 * @returns アップロードされたJSONのURL
 */
export async function uploadEpochMetadata(
  epochId: number,
  metadata: {
    name: string;
    description: string;
    image: string;
    animation_url: string;
    attributes: Array<{ trait_type: string; value: string | number }>;
  }
): Promise<string> {
  const tagName = `epoch-${epochId}`;
  const filename = `epoch-${epochId}-metadata.json`;

  console.log(`Uploading metadata to GitHub Release: ${tagName}/${filename}`);

  const release = await getOrCreateRelease(tagName);
  const content = JSON.stringify(metadata, null, 2);
  const url = await uploadAsset(release, filename, content, 'application/json');

  console.log(`Metadata uploaded: ${url}`);
  return url;
}

/**
 * 状態データ（checkpoint）をGitHub Releaseにアップロード
 *
 * @param epochId Epoch ID
 * @param stateType 'start' | 'end'
 * @param stateBytes 状態データ（2560 bytes）
 * @returns アップロードされたファイルのURL
 */
export async function uploadStateCheckpoint(
  epochId: number,
  stateType: 'start' | 'end',
  stateBytes: Uint8Array
): Promise<string> {
  const tagName = `epoch-${epochId}`;
  const filename = `epoch-${epochId}-${stateType}-state.bin`;

  console.log(`Uploading ${stateType} state to GitHub Release: ${tagName}/${filename}`);

  const release = await getOrCreateRelease(tagName);
  const url = await uploadAsset(
    release,
    filename,
    Buffer.from(stateBytes),
    'application/octet-stream'
  );

  console.log(`${stateType} state uploaded: ${url}`);
  return url;
}
