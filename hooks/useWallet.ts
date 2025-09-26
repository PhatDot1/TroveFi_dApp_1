"use client"

import { useState, useEffect, useCallback } from "react"
import { connectWallet, disconnectWallet, getProvider, getSigner } from "@/lib/web3"
import type { BrowserProvider, Signer } from "ethers"

interface WalletState {
  isConnected: boolean
  address: string | null
  isConnecting: boolean
  provider: BrowserProvider | null
  signer: Signer | null
  chainId: number | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    provider: null,
    signer: null,
    chainId: null
  })

  // Stable connect function
  const connect = useCallback(async () => {
    if (state.isConnecting || state.isConnected) return

    setState(prev => ({ ...prev, isConnecting: true }))

    try {
      const { provider, signer, address } = await connectWallet()
      const network = await provider.getNetwork()
      
      setState({
        isConnected: true,
        address,
        isConnecting: false,
        provider,
        signer,
        chainId: Number(network.chainId)
      })
      
      console.log("[useWallet] Connected:", { address, chainId: Number(network.chainId) })
    } catch (error) {
      console.error("[useWallet] Connection failed:", error)
      setState(prev => ({ 
        ...prev, 
        isConnecting: false,
        isConnected: false,
        address: null,
        provider: null,
        signer: null,
        chainId: null
      }))
      throw error
    }
  }, [state.isConnecting, state.isConnected])

  // Stable disconnect function
  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet()
      setState({
        isConnected: false,
        address: null,
        isConnecting: false,
        provider: null,
        signer: null,
        chainId: null
      })
      console.log("[useWallet] Disconnected")
    } catch (error) {
      console.error("[useWallet] Disconnect failed:", error)
    }
  }, [])

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === "undefined" || !window.ethereum) return

      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        
        if (accounts && accounts.length > 0) {
          console.log("[useWallet] Found existing connection, reconnecting...")
          await connect()
        }
      } catch (error) {
        console.error("[useWallet] Failed to check existing connection:", error)
      }
    }

    checkConnection()
  }, []) // Remove connect from dependencies to avoid infinite loop

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log("[useWallet] Accounts changed:", accounts)
      
      if (accounts.length === 0) {
        // User disconnected
        setState({
          isConnected: false,
          address: null,
          isConnecting: false,
          provider: null,
          signer: null,
          chainId: null
        })
      } else if (accounts[0] !== state.address) {
        // Account switched - reconnect
        try {
          const provider = getProvider()
          const signer = getSigner()
          const network = await provider.getNetwork()
          
          setState(prev => ({
            ...prev,
            address: accounts[0],
            provider,
            signer,
            chainId: Number(network.chainId)
          }))
        } catch (error) {
          console.error("[useWallet] Failed to handle account change:", error)
          await disconnect()
        }
      }
    }

    const handleChainChanged = async (chainId: string) => {
      console.log("[useWallet] Chain changed:", chainId)
      
      if (state.isConnected) {
        // Reconnect to update provider/signer for new chain
        try {
          const provider = getProvider()
          const signer = getSigner()
          
          setState(prev => ({
            ...prev,
            provider,
            signer,
            chainId: parseInt(chainId, 16)
          }))
        } catch (error) {
          console.error("[useWallet] Failed to handle chain change:", error)
          await disconnect()
        }
      }
    }

    const handleDisconnect = () => {
      console.log("[useWallet] Wallet disconnected")
      setState({
        isConnected: false,
        address: null,
        isConnecting: false,
        provider: null,
        signer: null,
        chainId: null
      })
    }

    window.ethereum.on("accountsChanged", handleAccountsChanged)
    window.ethereum.on("chainChanged", handleChainChanged)
    window.ethereum.on("disconnect", handleDisconnect)

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
        window.ethereum.removeListener("disconnect", handleDisconnect)
      }
    }
  }, [state.address, state.isConnected, disconnect])

  return {
    isConnected: state.isConnected,
    address: state.address,
    isConnecting: state.isConnecting,
    provider: state.provider,
    signer: state.signer,
    chainId: state.chainId,
    connect,
    disconnect
  }
}