# Life Games (Farcaster Mini App) — Spec v0.1

**Date:** 2025-12-12 (JST)  
**Scope:** Requirements + functional design + contract/API interfaces for a Farcaster Mini App running a weekly “Conway’s Game of Life” league on Base.

---

## 0. Goals

- Provide a **weekly league** where users design an initial Game of Life board under weekly constraints, simulate **256 generations**, and submit the board as an **NFT mint**.
- Make the league **verifiable** on-chain with minimal gas:
  - Weekly settlement posts **one Merkle root** on-chain.
  - Users **claim** rewards themselves (batch claim supported).
- Keep the experience fun:
  - **Unlimited** board building and simulation in the client.
  - **Mint count only** is limited (free quota + paid unlimited).

---

## 1. Glossary

- **Season**: One week. Identified by `seasonId` computed from chain time (JST week boundary).
- **Board**: 20×20 cells (400 cells). Initial “live” cells set by the user.
- **Wall**: Weekly fixed obstacles (cells that cannot be toggled live).
- **boardBits**: Bitset representing initial live cells.
- **wallBits**: Bitset representing wall/blocked cells.
- **Token**: `payToken` for that season (either native ETH on Base, or a single ERC20).
- **Root**: Merkle root of `(tokenId, score)` for the season.
- **Claim**: User action to receive reward computed from `score / totalScore * prizeSnapshot`.

---

## 2. Game Rules (Fixed)

- Grid: **20×20**
- Life rules: **B3/S23** (standard Conway)
- Simulation length: **256 generations** (generation 0 = initial state)
- Update is synchronous per generation.
- Walls:
  - Wall cells are **never live**.
  - Any attempt to submit a board with `boardBits & wallBits != 0` MUST revert.

---

## 3. Weekly Challenge Inputs (Per Season)

Each season defines:

- `wallBits` (weekly fixed)
- `initialLiveCount` constraint (weekly fixed), e.g. **exactly N**
  - Client must enforce in UI and contract must validate on mint.
- Payment config for the season:
  - `payToken` (native or ERC20; **one choice per season**)
  - `mintFee` (fixed for the whole season; changes apply **next season only**)
  - `prizeShareBps` (how much of paid mint fees go to prize pool; fixed per season)
- Settlement config:
  - `settlementCutoffTimestamp` (optional; recommended for sponsor deposits; see §9.4)

---

## 4. Time & SeasonId (On-chain, JST week boundary)

### 4.1 JST week boundary
We define “week” in JST to reduce user confusion.

- `JST_OFFSET = 9 hours = 32400 seconds`
- `WEEK = 604800 seconds`

### 4.2 seasonId formula
Let:
- `t = block.timestamp + JST_OFFSET`
- `weekIndex = floor(t / WEEK)`
- `seasonId = weekIndex` (uint64)

**Note:** This maps weeks monotonically and avoids string parsing. The UI can derive calendar week labels.

### 4.3 daily index (for mint quota)
- `DAY = 86400 seconds`
- `dayIndex = floor((block.timestamp + JST_OFFSET) / DAY)` (uint32)

---

## 5. Mint Quota (Free 3 or 5, then paid unlimited)

### 5.1 Policy
- Unlimited editor/simulation (off-chain).
- **Mint count only** is rate-limited:
  - Free mints per day:
    - Default: **3**
    - Premium (Neynar score above threshold): **5**
  - After free quota used, user can mint unlimited by paying `mintFee` (season-fixed).

### 5.2 Premium eligibility (Neynar score)
- Neynar “User Quality Score” is a weekly-updated 0..1 score.
- For minimal trust + simple on-chain verification, use **server-signed coupon**:
  - Server checks Neynar API.
  - Server signs a coupon asserting “premium for address A on dayIndex D”.
  - Contract verifies signature; coupon cannot be forged.

### 5.3 Quota accounting (on-chain)
Use a per-user rolling day struct (cheap) instead of mapping-by-day:

```
struct MintDayCounter {
  uint32 dayIndex;   // last dayIndex seen
  uint16 count;      // mints performed on that day
}
mapping(address => MintDayCounter) public mintCounter;
```

On mint:
- compute `d = dayIndex()`
- if `mintCounter[msg.sender].dayIndex != d`: reset `count = 0`, set `dayIndex = d`
- increment count after passing fee/quota checks

### 5.4 Free vs paid decision
Let:
- `limit = 3` normally
- `limit = 5` if a valid premium coupon is supplied for `(msg.sender, d)`

Then:
- if `count < limit`: mint is **free** (`msg.value == 0` for native seasons; no ERC20 transfer)
- else: mint is **paid** (collect fee)

---

## 6. Data Encoding: boardBits / wallBits (20×20)

### 6.1 Coordinate system
- `(x, y)` where:
  - `x = 0..19` left to right
  - `y = 0..19` top to bottom
- Cell index:
  - `i = y * 20 + x` (0..399)

### 6.2 Bit ordering (canonical)
We define a canonical **byte/bit mapping** so everyone encodes identically.

- Create a 50-byte array `B[50]` initialized to 0.
- For each live cell index `i`:
  - `byteIndex = floor(i / 8)` (0..49)
  - `bitInByte = i % 8` (0..7)
  - Set: `B[byteIndex] |= (1 << bitInByte)`

So **index 0** sets the **LSB of byte 0**, index 1 sets bit1 of byte0, etc.

### 6.3 Packing into bytes32 × 2 (64 bytes)
- Let `P` be a 64-byte array (zero-padded).
- Copy `B[0..49]` into `P[0..49]`, leaving `P[50..63]=0`.
- Store:
  - `bitsA = bytes32(P[0..31])`
  - `bitsB = bytes32(P[32..63])`

This representation works for both `boardBits` and `wallBits`.

### 6.4 Validation utilities
- `popcount(boardBits) == initialLiveCount` must hold (constraint)
- `boardBits & wallBits == 0` must hold (cannot place on walls)

---

## 7. TokenId (duplicate board prevention)

To prevent duplicate submissions for the same season:

- TokenId is derived from the canonical packed bitsets and season parameters:

```
tokenId = uint256(keccak256(
  abi.encode(
    seasonId,
    boardBitsA, boardBitsB,
    wallBitsA,  wallBitsB,
    rulesetId,          // constant for B3/S23
    initialLiveCount,   // weekly constraint value
    gridW, gridH,       // 20,20 (optional)
    T                   // 256 (optional)
  )
))
```

Mint must revert if tokenId already exists (standard ERC721 behavior).

---

## 8. On-chain Architecture (Contracts)

We split contracts into stable vs upgradable.

### 8.1 WallRegistry (Upgradeable Proxy)
**Responsibility:** store weekly wallBits + weekly constraints.

- Upgradable: YES (proxy style)
- Safety: MUST enforce “wall set once per season”.

**State (minimum):**
- `mapping(uint64 seasonId => SeasonConfig) season;`

```
struct SeasonConfig {
  bool    exists;
  bytes32 wallA;
  bytes32 wallB;
  uint16  initialLiveCount;
  address payToken;        // address(0) => native
  uint256 mintFee;         // in wei for native; in token units for ERC20
  uint16  prizeShareBps;   // 0..10000
  uint64  feeScheduleId;   // optional if using separate FeeManager schedules
}
```

**Admin functions:**
- `setSeasonConfig(seasonId, wallA, wallB, initialLiveCount, payToken, mintFee, prizeShareBps)`
  - MUST revert if `seasonId` already exists
- (Optional) `setNextSeasonDefaults(...)` for ops convenience

**Read functions:**
- `getSeason(seasonId) -> SeasonConfig`
- `isSeasonConfigured(seasonId) -> bool`

**Events:**
- `SeasonConfigured(seasonId, wallA, wallB, initialLiveCount, payToken, mintFee, prizeShareBps)`

**Access control:**
- Role-based (e.g., `DEFAULT_ADMIN_ROLE`)
- Upgrade admin recommended to be multisig + timelock.

---

### 8.2 FeeManager (Upgradeable Proxy) — optional split
You may either:
- (A) keep fee fields inside WallRegistry (simpler), or
- (B) split to FeeManager for future flexibility.

Because you want “payToken per season” and “sponsor deposits”, **B is recommended**.

**Responsibilities:**
- Maintain season payment token choice and fee (frozen once season begins).
- Collect paid mint fees and split:
  - prize pool portion
  - ops treasury portion
- Hold sponsor deposits pre-settlement.
- Provide `prizeBalance(seasonId)` for settlement snapshotting.

**Key state:**
- `opsTreasury` (address)
- `prizeVault` (address or internal accounting)
- `mapping(seasonId => PaymentConfig)` seasonPay

```
struct PaymentConfig {
  bool configured;
  address payToken;      // 0 => native
  uint256 mintFee;
  uint16 prizeShareBps;
  uint256 prizeBalance;  // accumulated for this season
  uint256 opsBalance;    // accumulated for this season (or direct transfer)
  bool finalizedSnapshotTaken;
}
```

**Functions:**
- `configureSeasonPayment(seasonId, payToken, mintFee, prizeShareBps)`
  - MUST revert if already configured
- `collectFee{value?}(seasonId, payer, feeAmount)`
  - called by NFT contract when paid mint is required
  - splits fee and updates `prizeBalance`
- `sponsorDeposit(seasonId, amount)` (ERC20)
- `sponsorDepositNative(seasonId)` (native)
- `getPrizeBalance(seasonId) -> uint256`
- `snapshotPrize(seasonId) -> uint256` (called by settlement contract; returns snapshot and locks)

**Events:**
- `SeasonPaymentConfigured(...)`
- `FeeCollected(seasonId, payer, payToken, amount)`
- `SponsorDeposited(seasonId, sponsor, payToken, amount)`
- `PrizeSnapshot(seasonId, payToken, prizeSnapshot)`

---

### 8.3 LifeLeagueNFT (Prefer non-upgradable)
**Responsibility:** mint submissions and store boardBits (not wallBits).

**State:**
- `WallRegistry wallRegistry`
- `FeeManager feeManager` (if split)
- `mapping(uint256 tokenId => BoardData)` storage
- `mapping(address => MintDayCounter)` mintCounter

```
struct BoardData {
  uint64 seasonId;
  bytes32 boardA;
  bytes32 boardB;
}
```

**Mint function:**
`mint(boardA, boardB, premiumCoupon?, couponSig?) payable`

Steps:
1. `seasonId = currentSeasonId()` (from block timestamp)
2. Read season config from WallRegistry:
   - must exist
   - get wallA/wallB and `initialLiveCount` and payment config
3. Validate:
   - `popcount(board)==initialLiveCount`
   - `(board & wall) == 0`
4. Determine today’s mint count and free limit (3/5 using coupon):
   - update/reset MintDayCounter if day changed
5. If paid required:
   - If payToken == native: `require(msg.value >= mintFee)`
   - Else: require `msg.value==0` and collect ERC20 via `transferFrom`
   - Call `feeManager.collectFee(...)` (or handle internally if not split)
6. Compute `tokenId` via hash (see §7) and `_safeMint(msg.sender, tokenId)`
7. Save `BoardData` for the tokenId
8. Emit:
   - `SubmissionMinted(seasonId, tokenId, owner, boardA, boardB)` (optional board in event too)

**Events:**
- `SubmissionMinted(seasonId, tokenId, owner)`
- (Optional) `SubmissionData(seasonId, tokenId, boardA, boardB)` for easy indexing

---

### 8.4 SeasonSettlement (Non-upgradable recommended)
**Responsibility:** store weekly Merkle root + totals + prize snapshot, and allow claim (batch).

**State:**
```
struct SeasonFinal {
  bool finalized;
  bytes32 merkleRoot;
  uint256 totalScore;
  address payToken;        // 0 => native
  uint256 prizeSnapshot;   // fixed at finalize
}
mapping(uint64 => SeasonFinal) public finals;
mapping(uint256 => bool) public claimed; // tokenId => claimed?
LifeLeagueNFT nft;
FeeManager feeManager; // for snapshotting + funding
```

**Finalize (weekly, one TX):**
`finalizeSeason(seasonId, merkleRoot, totalScore)`

- Require `seasonId < currentSeasonId()` (must be in the past)
- Require not already finalized
- Call `feeManager.snapshotPrize(seasonId)` to obtain `prizeSnapshot` and `payToken`
- Store finals[seasonId] = (root, totalScore, payToken, prizeSnapshot)
- Emit `SeasonFinalized(seasonId, root, totalScore, payToken, prizeSnapshot)`

**Claim (batch):**
`claimBatch(seasonId, tokenIds[], scores[], proofs[])`

- Require finals[seasonId].finalized
- For each entry:
  - Validate ownership: `nft.ownerOf(tokenId) == msg.sender` (or approved)
  - Validate token belongs to season: `nft.seasonOf(tokenId) == seasonId` (via stored BoardData)
  - Validate not claimed
  - Validate Merkle proof of leaf = hash(tokenId, score)
  - Accumulate `sumScore += score`
  - Mark claimed[tokenId] = true
- Compute total reward:
  - If `prizeSnapshot == 0` or `totalScore == 0`: reward = 0
  - Else reward = `prizeSnapshot * sumScore / totalScore`
- Pay out in `payToken`:
  - native: transfer ETH
  - ERC20: transfer token
- Emit `ClaimedBatch(seasonId, msg.sender, tokenIds.length, sumScore, reward)`

**Notes:**
- If you want to avoid a loop that can be too large, cap `tokenIds.length` (e.g., 50).
- To avoid reentrancy, use checks-effects-interactions + ReentrancyGuard.

---

## 9. Sponsor & Prize Mechanics

### 9.1 Prize sources
- Paid mint fees (prizeShareBps portion)
- Sponsor deposits

### 9.2 Prize token
- Exactly **one pay token per season** (native or one ERC20)
- Sponsor deposits must be in the same token for that season.

### 9.3 Prize can be zero
- Season can have `prizeSnapshot = 0`
- Claims still work (reward = 0), useful for “practice” weeks.

### 9.4 Deposit cutoff (recommended)
To prevent confusion after finalize:
- The prize is snapshotted at finalize time.
- Any deposits after finalize should go to:
  - either `nextSeasonCarry`, or
  - a separate “future prize” pool.

Minimal rule:
- FeeManager `snapshotPrize(seasonId)` sets `finalizedSnapshotTaken = true`
- After that, sponsor deposits for that season revert OR are redirected to next season.

---

## 10. Server Responsibilities (Required)

Because scoring is deterministic but must be trustedless-verifiable, we do:

- Server computes all scores off-chain and publishes:
  - Leaderboard
  - Per-token score
  - Merkle proofs for claims
- Server sends finalize TX once per week.

### 10.1 Required DB fields
For each minted submission:
- `seasonId`
- `tokenId`
- `owner`
- `boardA, boardB`
- Derived:
  - `score`
  - (Optional) final board hash, period, etc.

### 10.2 Required endpoints (suggested)
- `GET /season/current` -> seasonId, wallBits, initialLiveCount, payToken, mintFee, prize info
- `GET /season/{seasonId}/leaderboard?limit=50`
- `GET /season/{seasonId}/claims?owner=0x...`
  - returns: `tokenIds[], scores[], proofs[]` for unclaimed tokens
- `POST /coupon/premium`
  - input: address + signed message from wallet
  - output: premium coupon + signature (if eligible)
- `GET /token/{tokenId}` -> boardBits, score, owner, claimed?

### 10.3 Transparency
Publish:
- exact scoring function implementation (open-source)
- Merkle tree construction details:
  - leaf = `keccak256(abi.encode(tokenId, score))`
  - sorting rule (e.g., by tokenId ascending) used before building the tree

---

## 11. Client / Mini App UX Requirements

### 11.1 Home
- This week rule card:
  - wall preview
  - initialLiveCount
  - sim length (256)
  - pay token + fee
  - prize (estimated) + “can be zero”
- Buttons: Create / Leaderboard / My

### 11.2 Editor (Unlimited)
- 20×20 grid editor
- wall cells locked
- initial live count counter (must match exactly to enable mint)
- Simulation playback:
  - 0..256 slider
  - play/pause
  - speed selector
- Local “predicted score” display (computed in client)
- Mint button:
  - Shows “Free mint remaining today: X”
  - If paid: shows token + amount and triggers approval flow for ERC20

### 11.3 Leaderboard
- Top N with score + user identity + preview
- Shows status:
  - “Not finalized” vs “Finalized (claim available)”

### 11.4 My Page
- List user’s tokens for the season
- Shows:
  - total unclaimed reward estimate
  - **Claim All** button (batch)
- If too many tokens:
  - auto-split into multiple claims

---

## 12. Security / Abuse Considerations

- Duplicate prevention via tokenId hash.
- Walls set-once per season to prevent manipulation.
- Premium coupon must include:
  - `address`, `dayIndex`, `expiry` (optional), `nonce` (optional)
- Rate limiting at server level too (protect endpoints).
- Reentrancy guard on claim payout.
- Use safe ERC20 transfers.
- Consider allowing contract-based wallets; coupon verification should not rely on EOA-only assumptions.

---

## 13. Deployment & Ops Notes (Base)

- WallRegistry and FeeManager are upgradeable:
  - Upgrade admin should be multisig.
  - Prefer timelock for upgrades.
- LifeLeagueNFT + SeasonSettlement preferably non-upgradable for trust.
- Weekly ops checklist:
  1) configure next season wall + constraints + pay token + fee
  2) monitor mints and sponsor deposits
  3) after season end, compute scores + build Merkle tree
  4) call `finalizeSeason(seasonId, root, totalScore)`
- Monitoring:
  - watch `SeasonConfigured`, `SubmissionMinted`, `SeasonFinalized`, `ClaimedBatch`

---

## 14. Open Decisions (Keep minimal for v0)
- Score definition (currently placeholder). Choose one and freeze it for v0:
  - Example A: `score = alive(256)` (cells alive at final gen)
  - Example B: `score = sum_{t=1..256} alive(t)` (longevity)
  - Example C: include “extinction bonus”
- Whether to display replay GIF exports in casts (recommended but optional in v0).

---

## Appendix A — Minimal Score Function Template (example)
If you choose “longevity”:

- For each generation `t=1..256`:
  - compute alive cells `a_t`
  - accumulate `score += a_t`
- Special:
  - if extinction occurs at generation `k` (<256): still continue generations with 0 alive
  - optional bonus: if `a_256 == 0` then `score += extinctionBonus`

**Important:** Whatever you choose must be deterministic and published.

