import { BrowserProvider, Contract, JsonRpcProvider } from "ethers"
import type { Signer } from "ethers"

// Flow EVM Mainnet Configuration
const FLOW_EVM_MAINNET_CONFIG = {
  chainId: 747, // 0x2eb in hex
  name: "Flow EVM Mainnet",
  rpcUrl: "https://mainnet.evm.nodes.onflow.org",
  blockExplorer: "https://evm.flowscan.io",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18,
  },
}

// Contract addresses on Flow EVM Mainnet - UPDATED WITH YOUR DEPLOYED ADDRESSES
export const contracts = {
  coreVault: "0xbD82c706e3632972A00E288a54Ea50c958b865b2",
  vaultExtension: "0xBaF543b07e01F0Ed02dFEa5dfbAd38167AC9be57",
  frontendHelper: "0x79dd832b6cCe9DB201cDb18FbeD65a333354e031",
  priceOracle: "0xb7E587bC227b0b36644a1503D02f6955c884e922",

  tokens: {
    NATIVE_FLOW: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    WFLOW: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e",
    USDC: "0xF1815bd50389c46847f0Bda824eC8da914045D14", // stgUSDC
    USDT: "0x674843C06FF83502ddb4D37c2E09C01cdA38cbc8", // stgUSDT
    USDF: "0x2aaBea2058b5aC2D339b163C6Ab6f2b6d53aabED", // USD Flow
    WETH: "0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590",
    CBBTC: "0xA0197b2044D28b08Be34d98b23c9312158Ea9A18",
  },
}

export const RiskLevel = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
} as const

export const riskLevelNames = ["LOW", "MEDIUM", "AGGRESSIVE"]
export const riskLevelDescriptions = {
  LOW: "Higher win probability, smaller payouts",
  MEDIUM: "Balanced risk/reward",
  HIGH: "Lower probability, bigger jackpots",
}

let provider: BrowserProvider | null = null
let signer: Signer | null = null
let readOnlyProvider: JsonRpcProvider | null = null

function getReadOnlyProvider(): JsonRpcProvider {
  if (!readOnlyProvider) {
    readOnlyProvider = new JsonRpcProvider(FLOW_EVM_MAINNET_CONFIG.rpcUrl)
  }
  return readOnlyProvider
}

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: Signer; address: string }> {
  try {
    if (!window.ethereum) {
      throw new Error("Please install a Web3 wallet like MetaMask")
    }

    const instance = window.ethereum
    provider = new BrowserProvider(instance)

    // Check if we need to switch to Flow EVM Mainnet
    const network = await provider.getNetwork()
    const currentChainId = Number(network.chainId)

    if (currentChainId !== FLOW_EVM_MAINNET_CONFIG.chainId) {
      try {
        await instance.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${FLOW_EVM_MAINNET_CONFIG.chainId.toString(16)}` }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await instance.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${FLOW_EVM_MAINNET_CONFIG.chainId.toString(16)}`,
                chainName: FLOW_EVM_MAINNET_CONFIG.name,
                nativeCurrency: FLOW_EVM_MAINNET_CONFIG.nativeCurrency,
                rpcUrls: [FLOW_EVM_MAINNET_CONFIG.rpcUrl],
                blockExplorerUrls: [FLOW_EVM_MAINNET_CONFIG.blockExplorer],
              },
            ],
          })
        } else {
          throw switchError
        }
      }

      provider = new BrowserProvider(instance)
    }

    await provider.send("eth_requestAccounts", [])
    signer = await provider.getSigner()
    const address = await signer.getAddress()

    return { provider, signer, address }
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    throw error
  }
}

export function getSigner(): Signer {
  if (!signer) throw new Error("Wallet not connected")
  return signer
}

export function getProvider(): BrowserProvider {
  if (!provider) throw new Error("Wallet not connected")
  return provider
}

// FIXED: Core Vault Contract with proper ABIs
export function getCoreVaultContract(signerOverride?: Signer): Contract {
  const activeSigner = signerOverride || signer
  if (!activeSigner) throw new Error("Wallet not connected")

  const coreVaultABI = [
    // Deposit functions
    "function deposit(address asset, uint256 amount, address receiver, uint8 riskLevel) external returns (uint256 shares)",
    "function deposit(address asset, uint256 amount, address receiver) external returns (uint256 shares)",
    "function depositNativeFlow(address receiver, uint8 riskLevel) external payable returns (uint256 shares)",
    "function depositNativeFlow(address receiver) external payable returns (uint256 shares)",
    
    // Withdrawal functions
    "function requestWithdrawal() external",
    "function withdraw(address asset, uint256 amount, address receiver) external returns (uint256 shares)",
    
    // Risk and claims
    "function updateRiskLevel(uint8 newRiskLevel) external",
    "function claimEpochReward(uint256 epochNumber) external returns (bool won, uint256 rewardAmount)",
    
    // View functions
    "function getUserPosition(address user) external view returns (uint256 totalShares, uint256 lastDeposit, bool withdrawalRequested, uint256 withdrawalAvailableAt, uint8 riskLevel, uint256 totalDeposited)",
    "function getVaultMetrics() external view returns (uint256 totalValueLocked, uint256 totalUsers, uint256 totalSupply, uint256 managementFee, uint256 performanceFee, uint256 assetsCount, uint256 totalPrincipal, uint256 totalYieldGenerated, uint256 totalYieldDistributed)",
    "function balanceOf(address account) external view returns (uint256)",
    "function getSupportedAssets() external view returns (address[] memory)",
    "function getAssetBalance(address asset) external view returns (uint256 vaultBalance, uint256 strategyBalance, uint256 totalBalance)"
  ]

  return new Contract(contracts.coreVault, coreVaultABI, activeSigner)
}

// FIXED: Read-only Core Vault Contract
export function getCoreVaultContractReadOnly(): Contract {
  const provider = getReadOnlyProvider()

  const coreVaultABI = [
    "function getUserPosition(address user) external view returns (uint256 totalShares, uint256 lastDeposit, bool withdrawalRequested, uint256 withdrawalAvailableAt, uint8 riskLevel, uint256 totalDeposited)",
    "function getVaultMetrics() external view returns (uint256 totalValueLocked, uint256 totalUsers, uint256 totalSupply, uint256 managementFee, uint256 performanceFee, uint256 assetsCount, uint256 totalPrincipal, uint256 totalYieldGenerated, uint256 totalYieldDistributed)",
    "function balanceOf(address account) external view returns (uint256)",
    "function getSupportedAssets() external view returns (address[] memory)",
    "function getAssetBalance(address asset) external view returns (uint256 vaultBalance, uint256 strategyBalance, uint256 totalBalance)"
  ]

  return new Contract(contracts.coreVault, coreVaultABI, provider)
}

// FIXED: Vault Extension Contract
export function getVaultExtensionContract(signerOverride?: Signer): Contract {
  const activeSigner = signerOverride || signer
  if (!activeSigner) throw new Error("Wallet not connected")

  const vaultExtensionABI = [
    "function claimEpochReward(address user, uint256 epochNumber) external returns (bool won, uint256 rewardAmount)",
    "function setUserRiskLevel(uint8 newRiskLevel) external",
    "function recordDeposit(address user, address asset, uint256 amount, uint8 riskLevel) external",
    "function recordWithdrawal(address user, address asset, uint256 amount) external returns (bool success)"
  ]

  return new Contract(contracts.vaultExtension, vaultExtensionABI, activeSigner)
}

// FIXED: Read-only Vault Extension Contract  
export function getVaultExtensionContractReadOnly(): Contract {
  const provider = getReadOnlyProvider()

  const vaultExtensionABI = [
    "function getCurrentEpochStatus() external view returns (uint256 epochNumber, uint256 timeRemaining, uint256 yieldPool, uint256 participantCount)",
    "function getUserDeposit(address user) external view returns (uint256 totalDeposited, uint256 currentBalance, uint256 firstDepositEpoch, uint256 lastDepositEpoch, uint8 riskLevel, uint256 timeWeightedBalance)",
    "function isEligibleForEpoch(address user, uint256 epochNumber) external view returns (bool)",
    "function hasClaimedEpoch(address user, uint256 epochNumber) external view returns (bool)",
    "function getClaimableEpochs(address user) external view returns (uint256[] memory)",
    "function calculateRewardParameters(address user, uint256 epochNumber) external view returns (uint256 baseWeight, uint256 timeWeight, uint256 riskMultiplier, uint256 totalWeight, uint256 winProbability, uint256 potentialPayout)",
    "function getEpochInfo(uint256 epochNumber) external view returns (uint256 startTime, uint256 endTime, uint256 totalYieldPool, uint256 totalDistributed, uint256 participantCount, bool finalized)",
    "function currentEpoch() external view returns (uint256)",
    "function epochDuration() external view returns (uint256)",
    "function totalYieldPool() external view returns (uint256)"
  ]

  return new Contract(contracts.vaultExtension, vaultExtensionABI, provider)
}

// Frontend Helper Contract (optional - if you implement it)
export function getFrontendHelperContractReadOnly(): Contract {
  const provider = getReadOnlyProvider()

  const frontendHelperABI = [
    "function getUserClaimStatus(address user) external view returns (uint256[] memory claimableEpochs, uint256[] memory rewardAmounts, bool[] memory eligibilityStatus)",
    "function getBatchUserInfo(address[] memory users) external view returns (tuple(uint256 totalShares, uint256 totalDeposited, uint8 riskLevel, bool hasUnclaimedRewards)[] memory)",
    "function getVaultOverview() external view returns (uint256 totalValueLocked, uint256 totalUsers, uint256 currentEpoch, uint256 yieldPool, uint256 timeToNextEpoch)"
  ]

  return new Contract(contracts.frontendHelper, frontendHelperABI, provider)
}

export async function disconnectWallet() {
  provider = null
  signer = null
}