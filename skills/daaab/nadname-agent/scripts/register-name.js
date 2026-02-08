#!/usr/bin/env node
/**
 * 🌐 NNS Name Registration Script
 * Register a .nad name on Monad blockchain via Nad Name Service
 * 
 * Usage: 
 *   node register-name.js --name <name> [options]
 * 
 * Options:
 *   --name <name>      Name to register (required)
 *   --set-primary      Set as primary name after registration
 *   --managed          Use encrypted keystore (creates if doesn't exist)
 *   --address <addr>   Custom address (for verification)
 * 
 * Private key sources (in order of priority):
 *   1. PRIVATE_KEY environment variable (recommended ✅)
 *   2. ~/.nadname/private-key.enc (encrypted, managed mode)
 *   3. ~/.nadname/private-key (plaintext, managed mode only)
 * 
 * ⚠️ Security: This script does NOT auto-detect wallet locations outside
 *    ~/.nadname/ to avoid accessing unrelated credentials.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// Monad network configuration
const MONAD_RPC = 'https://rpc.monad.xyz';
const MONAD_CHAIN_ID = 143;
const NNS_CONTRACT = '0xE18a7550AA35895c87A1069d1B775Fa275Bc93Fb';

const CONFIG_DIR = path.join(process.env.HOME, '.nadname');
const ENCRYPTED_KEY_FILE = path.join(CONFIG_DIR, 'private-key.enc');
const PLAIN_KEY_FILE = path.join(CONFIG_DIR, 'private-key');
const WALLET_INFO_FILE = path.join(CONFIG_DIR, 'wallet.json');

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.stdoutMuted = true;
    rl.question(question, (answer) => {
      rl.close();
      console.log(''); // New line after password
      resolve(answer);
    });
    
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted && stringToWrite.charCodeAt(0) !== 13) {
        rl.output.write('*');
      } else {
        rl.output.write(stringToWrite);
      }
    };
  });
}

async function getPrivateKey() {
  // Priority 1: Environment variable (recommended)
  if (process.env.PRIVATE_KEY) {
    const key = process.env.PRIVATE_KEY.trim();
    if (!key.startsWith('0x')) {
      console.error('❌ PRIVATE_KEY must start with 0x');
      process.exit(1);
    }
    return key;
  }
  
  // Priority 2: Managed mode (encrypted or plain keystore)
  if (hasFlag('--managed')) {
    return await getManagedKey();
  }
  
  console.error('❌ No private key source specified!');
  console.error('');
  console.error('Options:');
  console.error('1. export PRIVATE_KEY="0x..." (recommended)');
  console.error('2. node register-name.js --managed --name <name>');
  console.error('');
  process.exit(1);
}

async function getManagedKey() {
  // Check for encrypted key first
  if (fs.existsSync(ENCRYPTED_KEY_FILE)) {
    try {
      const password = await promptPassword('🔐 Enter keystore password: ');
      return decryptPrivateKey(password);
    } catch (error) {
      console.error('❌ Failed to decrypt private key:', error.message);
      process.exit(1);
    }
  }
  
  // Check for plain key (fallback)
  if (fs.existsSync(PLAIN_KEY_FILE)) {
    console.warn('⚠️  Using unencrypted private key (consider re-running setup with encryption)');
    return fs.readFileSync(PLAIN_KEY_FILE, 'utf8').trim();
  }
  
  // No keystore found - create new one
  console.log('📦 No keystore found. Creating new encrypted wallet...');
  return await createManagedWallet();
}

async function createManagedWallet() {
  // Create config directory
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  
  // Generate new wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log('🔑 Generated new wallet:');
  console.log(`📍 Address: ${wallet.address}`);
  console.log('');
  console.log('🔐 Setting up encryption...');
  
  const password = await promptPassword('Enter password for keystore: ');
  const confirmPassword = await promptPassword('Confirm password: ');
  
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match');
    process.exit(1);
  }
  
  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    process.exit(1);
  }
  
  // Encrypt and save private key
  encryptPrivateKey(wallet.privateKey, password);
  
  // Save wallet info (public data only)
  const walletInfo = {
    address: wallet.address,
    created: new Date().toISOString(),
    encrypted: true
  };
  
  fs.writeFileSync(WALLET_INFO_FILE, JSON.stringify(walletInfo, null, 2));
  fs.chmodSync(WALLET_INFO_FILE, 0o600);
  
  console.log('');
  console.log('✅ Encrypted keystore created successfully!');
  console.log('⚠️  IMPORTANT: Save your mnemonic phrase securely:');
  console.log('');
  console.log(`🔤 ${wallet.mnemonic.phrase}`);
  console.log('');
  console.log('This is your only backup - write it down safely!');
  
  const save = await prompt('Save mnemonic to encrypted file? (y/N): ');
  if (save.toLowerCase() === 'y') {
    const mnemonicFile = path.join(CONFIG_DIR, 'mnemonic.enc');
    const encMnemonic = encrypt(wallet.mnemonic.phrase, password);
    fs.writeFileSync(mnemonicFile, encMnemonic);
    fs.chmodSync(mnemonicFile, 0o400);
    console.log('💾 Mnemonic saved to encrypted file');
  }
  
  return wallet.privateKey;
}

function encryptPrivateKey(privateKey, password) {
  const encrypted = encrypt(privateKey, password);
  fs.writeFileSync(ENCRYPTED_KEY_FILE, encrypted);
  fs.chmodSync(ENCRYPTED_KEY_FILE, 0o600);
}

function decryptPrivateKey(password) {
  const encrypted = fs.readFileSync(ENCRYPTED_KEY_FILE, 'utf8');
  return decrypt(encrypted, password);
}

function encrypt(text, password) {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(salt);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  const result = {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    encrypted: encrypted
  };
  
  return JSON.stringify(result);
}

function decrypt(encryptedData, password) {
  const data = JSON.parse(encryptedData);
  const algorithm = 'aes-256-gcm';
  const salt = Buffer.from(data.salt, 'hex');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  const decipher = crypto.createDecipher(algorithm, key);
  
  decipher.setAAD(salt);
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  
  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function registerName(name, wallet, setPrimary = false) {
  console.log('🚀 Starting registration...');
  
  // Connect to Monad
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const signer = wallet.connect(provider);
  
  // Verify network
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(MONAD_CHAIN_ID)) {
    throw new Error(`Wrong network! Expected ${MONAD_CHAIN_ID}, got ${network.chainId}`);
  }
  
  console.log(`⛓️  Connected to Monad (${MONAD_CHAIN_ID})`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  const balanceInMON = ethers.formatEther(balance);
  
  console.log(`💰 Balance: ${balanceInMON} MON`);
  
  if (parseFloat(balanceInMON) < 50) { // Minimum for registration
    console.warn('⚠️  Low balance - make sure you have enough MON for registration');
  }
  
  // In a real implementation, you'd:
  // 1. Get current pricing from contract
  // 2. Encode the registration data
  // 3. Send transaction with MON value
  
  console.log('📝 Registration details:');
  console.log(`   Name: ${name}.nad`);
  console.log(`   Owner: ${wallet.address}`);
  console.log(`   Contract: ${NNS_CONTRACT}`);
  
  // For now, simulate the transaction
  console.log('');
  console.log('🔄 This would send a transaction to register the name...');
  console.log('⚠️  SIMULATION MODE - No actual transaction sent');
  console.log('');
  console.log('💡 To complete implementation:');
  console.log('   1. Get contract ABI from NNS docs');
  console.log('   2. Call registration function with proper parameters');
  console.log('   3. Send required MON amount as transaction value');
  
  // TODO: Uncomment when ready for real registration
  /*
  try {
    // Example transaction structure (adjust based on actual contract ABI)
    const tx = {
      to: NNS_CONTRACT,
      value: ethers.parseEther('324.5'), // Price in MON
      data: '0x...', // Encoded registration call
      gasLimit: 100000
    };
    
    console.log('📤 Sending registration transaction...');
    const result = await signer.sendTransaction(tx);
    console.log(`⏳ Transaction sent: ${result.hash}`);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await result.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Registration successful!');
      console.log(`🎉 ${name}.nad is now yours!`);
      
      if (setPrimary) {
        console.log('🔄 Setting as primary name...');
        // Call setPrimary function
      }
    } else {
      console.log('❌ Transaction failed');
    }
    
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    process.exit(1);
  }
  */
}

async function main() {
  const name = getArg('--name');
  const setPrimary = hasFlag('--set-primary');
  const customAddress = getArg('--address');
  
  if (!name) {
    console.error('❌ Usage: node register-name.js --name <name> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --name <name>      Name to register (required)');
    console.error('  --set-primary      Set as primary name');
    console.error('  --managed          Use encrypted keystore');
    console.error('  --address <addr>   Custom address for verification');
    console.error('');
    console.error('Examples:');
    console.error('  node register-name.js --name mybot');
    console.error('  node register-name.js --name agent --set-primary');
    console.error('  node register-name.js --managed --name myagent');
    process.exit(1);
  }

  try {
    console.log('🌐 NNS Name Registration');
    console.log('═'.repeat(50));
    
    // Get private key
    const privateKey = await getPrivateKey();
    const wallet = new ethers.Wallet(privateKey);
    
    console.log(`📍 Wallet: ${wallet.address}`);
    console.log(`📝 Name: ${name}.nad`);
    
    if (setPrimary) {
      console.log('✅ Will set as primary name');
    }
    
    console.log('');
    
    // Register the name
    await registerName(name, wallet, setPrimary);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}