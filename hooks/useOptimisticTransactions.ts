"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { useWallet } from "./useWallet"
import { getCoreVaultContract } from "@/lib/web3"
import { useOptimisticContractData } from "./useOptimisticContractData"

export function useOptimisticTransactions() {
  const { signer } = useWallet()
  const { 
    addOptimisticDeposit, 
    addOptimisticWithdrawal, 
    addOptimisticClaim, 
    addOptimisticRiskUpdate,
    removeOptimisticUpdate,
    forceRefresh 
  } = useOptimisticContractData()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const depositNativeFlow = async (amount: string, riskLevel: number) => {
    if (!signer) throw new Error("Wallet not connected")

    // Add optimistic update immediately
    const optimisticId = addOptimisticDeposit(amount, "FLOW", riskLevel)
    
    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const amountWei = ethers.parseEther(amount)
      const signerAddress = await signer.getAddress()

      const tx = await contract.depositNativeFlow(signerAddress, riskLevel, {
        value: amountWei,
        gasLimit: 500000
      })

      // Transaction submitted successfully
      console.log("[OptimisticTx] Native FLOW deposit submitted:", tx.hash)
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        console.log("[OptimisticTx] Native FLOW deposit confirmed")
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      }).catch((err) => {
        console.error("[OptimisticTx] Native FLOW deposit failed:", err)
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      })
      
      return tx.hash
    } catch (err: any) {
      console.error("[OptimisticTx] Native FLOW deposit failed:", err)
      removeOptimisticUpdate(optimisticId)
      setError(`Deposit failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const depositToken = async (tokenAddress: string, amount: string, riskLevel: number, decimals: number = 18) => {
    if (!signer) throw new Error("Wallet not connected")

    // Add optimistic update immediately
    const optimisticId = addOptimisticDeposit(amount, tokenAddress, riskLevel)
    
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
      
      console.log(`[OptimisticTx] Approving ${amount} tokens...`)
      const approveTx = await tokenContract.approve(
        "0xbD82c706e3632972A00E288a54Ea50c958b865b2",
        amountWei
      )
      await approveTx.wait()
      console.log("[OptimisticTx] Token approval successful")

      // Then deposit
      const contract = getCoreVaultContract(signer)
      const tx = await contract.deposit(tokenAddress, amountWei, signerAddress, riskLevel, {
        gasLimit: 500000
      })

      console.log("[OptimisticTx] Token deposit submitted:", tx.hash)
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        console.log("[OptimisticTx] Token deposit confirmed")
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      }).catch((err) => {
        console.error("[OptimisticTx] Token deposit failed:", err)
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      })
      
      return tx.hash
    } catch (err: any) {
      console.error("[OptimisticTx] Token deposit failed:", err)
      removeOptimisticUpdate(optimisticId)
      setError(`Token deposit failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const requestWithdrawal = async () => {
    if (!signer) throw new Error("Wallet not connected")

    // Add optimistic update immediately
    const optimisticId = addOptimisticWithdrawal()
    
    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const tx = await contract.requestWithdrawal({
        gasLimit: 300000
      })
      
      console.log("[OptimisticTx] Withdrawal request submitted:", tx.hash)
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        console.log("[OptimisticTx] Withdrawal request confirmed")
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      }).catch((err) => {
        console.error("[OptimisticTx] Withdrawal request failed:", err)
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      })
      
      return tx.hash
    } catch (err: any) {
      console.error("[OptimisticTx] Withdrawal request failed:", err)
      removeOptimisticUpdate(optimisticId)
      setError(`Withdrawal request failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const claimEpochReward = async (epochNumber: number) => {
    if (!signer) throw new Error("Wallet not connected")

    // Add optimistic update immediately
    const optimisticId = addOptimisticClaim(epochNumber)
    
    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      
      const tx = await contract.claimEpochReward(epochNumber, {
        gasLimit: 400000
      })
      
      console.log("[OptimisticTx] Epoch reward claim submitted:", tx.hash)
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        console.log("[OptimisticTx] Epoch reward claim confirmed")
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      }).catch((err) => {
        console.error("[OptimisticTx] Epoch reward claim failed:", err)
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      })
      
      return tx.hash
    } catch (err: any) {
      console.error("[OptimisticTx] Epoch reward claim failed:", err)
      removeOptimisticUpdate(optimisticId)
      setError(`Claim failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateRiskLevel = async (newRiskLevel: number) => {
    if (!signer) throw new Error("Wallet not connected")

    // Add optimistic update immediately
    const optimisticId = addOptimisticRiskUpdate(newRiskLevel)
    
    setLoading(true)
    setError(null)

    try {
      const contract = getCoreVaultContract(signer)
      const tx = await contract.updateRiskLevel(newRiskLevel, {
        gasLimit: 200000
      })
      
      console.log("[OptimisticTx] Risk level update submitted:", tx.hash)
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        console.log("[OptimisticTx] Risk level update confirmed")
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      }).catch((err) => {
        console.error("[OptimisticTx] Risk level update failed:", err)
        removeOptimisticUpdate(optimisticId)
        forceRefresh()
      })
      
      return tx.hash
    } catch (err: any) {
      console.error("[OptimisticTx] Risk level update failed:", err)
      removeOptimisticUpdate(optimisticId)
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
    claimEpochReward,
    updateRiskLevel,
    loading,
    error,
  }
}