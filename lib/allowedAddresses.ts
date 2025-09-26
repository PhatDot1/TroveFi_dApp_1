// Closed Beta Allowed Addresses
// Add new addresses to this list to grant access

export const ALLOWED_ADDRESSES = [
    "0xbaD4374FeB7ec757027CF2186B6eb6f32412f723",
    "0x1fF116257e646b6C0220a049e893e81DE87fc475",
    "0xD7669Dc5CAD7E1e8A334c046eE9A8A61b925Ed36",
    "0x79f5b5b0f95a160b",
    "0x000000000000000000000002a63090f980166B4e",
    "0x0eCDAdB4A6aB351596c26A5F236Ce59ADAD8dd29",
    "0x48743d9c75Be9A906FbEAA2429e0800171F5ed3B"
  ].map(addr => addr.toLowerCase()) // Normalize to lowercase for comparison
  
  export function isAddressAllowed(address: string | null): boolean {
    if (!address) return false
    return ALLOWED_ADDRESSES.includes(address.toLowerCase())
  }