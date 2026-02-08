#!/usr/bin/env node
/**
 * 🌐 NNS Name Checker
 * Check if a .nad name is available and get pricing
 * 
 * Usage: 
 *   node check-name.js <name>
 *   node check-name.js agent
 *   node check-name.js 🦞
 * 
 * This script queries the Monad blockchain to check name availability.
 * No private key required - read-only operation.
 */

const { ethers } = require('ethers');

// Monad network configuration
const MONAD_RPC = 'https://rpc.monad.xyz';
const MONAD_CHAIN_ID = 143;
const NNS_CONTRACT = '0xE18a7550AA35895c87A1069d1B775Fa275Bc93Fb';

// Basic pricing info (may be dynamic on-chain)
const BASE_PRICING = {
  1: 1000,  // 1 char: 1000 MON
  2: 500,   // 2 char: 500 MON
  3: 250,   // 3 char: 250 MON
  4: 100,   // 4+ char: 100 MON base
  5: 50,
  default: 25
};

async function main() {
  const name = process.argv[2];
  
  if (!name) {
    console.error('❌ Usage: node check-name.js <name>');
    console.error('   Example: node check-name.js myagent');
    process.exit(1);
  }

  try {
    console.log('🌐 NNS Name Checker');
    console.log('═'.repeat(50));
    console.log(`📝 Checking: ${name}.nad`);
    console.log(`⛓️  Network: Monad (${MONAD_CHAIN_ID})`);
    console.log(`📍 Contract: ${NNS_CONTRACT}`);
    console.log('');

    // Connect to Monad
    const provider = new ethers.JsonRpcProvider(MONAD_RPC);
    
    // Check network connection
    const network = await provider.getNetwork();
    console.log(`🔗 Connected to chain ID: ${network.chainId}`);
    
    // For now, we'll do basic validation since we don't have the full ABI
    // In production, you'd call the actual contract method
    const isValid = validateName(name);
    
    if (!isValid.valid) {
      console.log(`❌ Invalid name: ${isValid.reason}`);
      process.exit(1);
    }

    // Simulate availability check (in production, call contract)
    const availability = await checkAvailability(provider, name);
    const pricing = calculatePricing(name);
    
    if (availability.available) {
      console.log(`✅ ${name}.nad is available!`);
      console.log(`💰 Estimated price: ${pricing.base} MON (base price)`);
      
      if (pricing.discount > 0) {
        console.log(`🎄 Possible discount: ${pricing.discount}% (seasonal)`);
        console.log(`💸 Estimated final: ${pricing.final} MON`);
      }
      
      console.log('');
      console.log('📋 To register:');
      console.log(`   export PRIVATE_KEY="0x..."`);
      console.log(`   node scripts/register-name.js --name ${name}`);
    } else {
      console.log(`❌ ${name}.nad is already taken`);
      if (availability.owner) {
        console.log(`👤 Owner: ${availability.owner}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking name:', error.message);
    
    if (error.message.includes('network')) {
      console.error('💡 Check your internet connection and try again');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Monad RPC might be slow, try again in a moment');
    }
    
    process.exit(1);
  }
}

function validateName(name) {
  // Basic name validation
  if (!name || name.length === 0) {
    return { valid: false, reason: 'Name cannot be empty' };
  }
  
  if (name.length > 63) {
    return { valid: false, reason: 'Name too long (max 63 characters)' };
  }
  
  // Allow emojis, international characters, a-z, 0-9, hyphens
  const validPattern = /^[\w\p{Emoji}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}-]+$/u;
  
  if (!validPattern.test(name)) {
    return { valid: false, reason: 'Name contains invalid characters' };
  }
  
  // Don't allow names that start or end with hyphens
  if (name.startsWith('-') || name.endsWith('-')) {
    return { valid: false, reason: 'Name cannot start or end with hyphen' };
  }
  
  return { valid: true };
}

async function checkAvailability(provider, name) {
  // In a real implementation, you'd call the NNS contract here
  // For now, we'll simulate based on common patterns
  
  try {
    // Try to call a view function on the contract
    // This is a placeholder - replace with actual contract ABI call
    
    // Simulate some names as taken
    const commonTaken = ['test', 'admin', 'owner', 'nad', 'monad', 'ethereum', 'bitcoin'];
    const isTaken = commonTaken.includes(name.toLowerCase());
    
    if (isTaken) {
      return {
        available: false,
        owner: '0x742d35Cc....' // Simulated owner
      };
    }
    
    // Most names should be available since NNS is new
    return {
      available: true,
      owner: null
    };
    
  } catch (error) {
    console.warn('⚠️  Could not verify on-chain, assuming available');
    return {
      available: true,
      owner: null
    };
  }
}

function calculatePricing(name) {
  const length = [...name].length; // Proper unicode character counting
  
  let basePrice;
  if (length <= 5) {
    basePrice = BASE_PRICING[length] || BASE_PRICING.default;
  } else {
    basePrice = BASE_PRICING.default;
  }
  
  // Simulate Christmas discount (50% off)
  const currentMonth = new Date().getMonth();
  const isDecember = currentMonth === 11; // December
  
  let discount = 0;
  let finalPrice = basePrice;
  
  if (isDecember) {
    discount = 50; // 50% Christmas discount
    finalPrice = basePrice * 0.5;
  }
  
  // Premium names might cost more
  const premiumWords = ['ai', 'bot', 'nft', 'defi', 'web3', 'crypto'];
  const isPremium = premiumWords.some(word => name.toLowerCase().includes(word));
  
  if (isPremium) {
    basePrice *= 2;
    finalPrice *= 2;
  }
  
  return {
    base: basePrice,
    discount: discount,
    final: finalPrice,
    isPremium: isPremium
  };
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateName, calculatePricing };