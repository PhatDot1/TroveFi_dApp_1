"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { useWallet } from "./useWallet"
import { getCoreVaultContract, getVaultExtensionContract } from "@/lib/web3"

export function useTransactions() {
  const { signer } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const depositNativeFlow = async (amount: string, riskLevel: number) => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const amountWei = ethers.parseEther(amount)
      
      // Get signer address for the recipient parameter
      const signerAddress = await signer.getAddress()

      // Call depositNativeFlow with correct parameters: (recipient, riskLevel)
      const tx = await contract.depositNativeFlow(signerAddress, riskLevel, {
        value: amountWei,
        gasLimit: 500000 // Add gas limit to prevent estimation issues
      })

      const receipt = await tx.wait()
      console.log("[v0] Native FLOW deposit successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Native FLOW deposit failed:", err)
      setError(`Deposit failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const depositToken = async (tokenAddress: string, amount: string, riskLevel: number, decimals: number = 18) => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const signerAddress = await signer.getAddress()
      
      // First approve the token
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function approve(address spender, uint256 amount) returns (bool)"],
        signer
      )
      
      const amountWei = ethers.parseUnits(amount, decimals)
      
      console.log(`[v0] Approving ${amount} tokens...`)
      const approveTx = await tokenContract.approve(
        "0xbD82c706e3632972A00E288a54Ea50c958b865b2", // Core vault address
        amountWei
      )
      await approveTx.wait()
      console.log("[v0] Token approval successful")

      // Then deposit
      const contract = getCoreVaultContract(signer)
      const tx = await contract.deposit(tokenAddress, amountWei, signerAddress, riskLevel, {
        gasLimit: 500000
      })

      const receipt = await tx.wait()
      console.log("[v0] Token deposit successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Token deposit failed:", err)
      setError(`Token deposit failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const requestWithdrawal = async () => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const tx = await contract.requestWithdrawal({
        gasLimit: 300000
      })
      
      const receipt = await tx.wait()
      console.log("[v0] Withdrawal request successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Withdrawal request failed:", err)
      setError(`Withdrawal request failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async (asset: string, amount: string) => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const signerAddress = await signer.getAddress()
      const amountWei = ethers.parseUnits(amount, 18)

      const tx = await contract.withdraw(asset, amountWei, signerAddress, {
        gasLimit: 400000
      })
      
      const receipt = await tx.wait()
      console.log("[v0] Withdrawal successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Withdrawal failed:", err)
      setError(`Withdrawal failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const claimEpochReward = async (epochNumber: number) => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      
      // Call claimEpochReward on the core vault (which forwards to extension)
      const tx = await contract.claimEpochReward(epochNumber, {
        gasLimit: 400000
      })
      
      const receipt = await tx.wait()
      console.log("[v0] Epoch reward claim successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Epoch reward claim failed:", err)
      setError(`Claim failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateRiskLevel = async (newRiskLevel: number) => {
    if (!signer) throw new Error("Wallet not connected")

    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const tx = await contract.updateRiskLevel(newRiskLevel, {
        gasLimit: 200000
      })
      
      const receipt = await tx.wait()
      console.log("[v0] Risk level update successful:", receipt.hash)
      
      return tx.hash
    } catch (err: any) {
      console.error("[v0] Risk level update failed:", err)
      setError(`Risk level update failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    depositNativeFlow,
    depositToken,
    requestWithdrawal,
    withdraw,
    claimEpochReward,
    updateRiskLevel,
    loading,
    error,
  }
}