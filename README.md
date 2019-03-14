
# web3-group-encryption
### WARNING -- *THIS IS EXPERIMENTAL CRYPTOGRAPHIC SOFTWARE. DO NOT USE IT FOR CRITICAL INFRASTRUCTURE WITHOUT AUDITING.*
Simple library for encrypted group messaging with web3 addresses

This library provides support for:

 - Creating groups with symmetric encryption
 - Sending invites with asymmetric keys
 - Sending private 1:1 messages with asymmetric encryption
 - Creating per-user asymmetric keys
 - Encrypting and decrypting data using web3 addresses, even if no private key is available
 - Storage and recovery of group keys


## Install

    npm install --save web3-group-encryption
## Test

    npm run test

## Usage
	
    // set up
    const {Web3Encryption, User} = require('web3-group-encryption')
    const web3 = Web3Encryption.constructWeb3('https://mainnet.infura.io/v3')
    const bobAccount = web3.eth.accounts.create()
    const bob = new User(web3, bobAccount)
    const aliceAccount = web3.eth.accounts.create()
    const alice = web3.eth.accounts.create()

    // key exchange
    const bobKeySig = await bob.keyManager.signPublicKey()  
    const aliceKeySig  =  await  alice.keyManager.signPublicKey()
    bob.keyManager.addKeybind(aliceKeySig)
    alice.keyManager.addKeybind(bobKeySig)
    
    // Private messaging
    const privateMessage = "Hello bob!"
    const pvtCipher = alice.keyManager.encryptFor(privateMessage, bob.address)
    const pvtDecipher = bob.keyManager.decryptFrom(pvtCipher, alice.address)
    console.log(pvtDecipher == privateMessage)
    > true
    
    // Group messaging
    const cindyAccount = web3.eth.accounts.create()
    const cindy = new User(web3, cindyAccount)
    const cindyKeySig = cindy.keyManager.signPublicKey()
    bob.keyManager.addKeybind(cindyKeySig)
    alice.keyManager.addKeybind(cindyKeySig)
    const bobGroup = bob.groupManager.createGroup('abc-group')
    const aliceInvite = bob.groupManager.createInvite('abc-group', alice.address)
    const aliceGroup = alice.groupManager.joinGroup(aliceInvite, bobKeySig)
    const cindyInvite = bob.groupManager.createInvite('abc-group', cindy.address)
    // Cindy has not already saved bob's key, so she does it when she joins abc
    const cindyGroup = cindy.groupManager.joinGroup(cindyInvite, bobKeySig)
    const groupMessage = "Hello Cindy and Alice!"
    const groupCipher = bobGroup.encrypt(groupMessage)
    const aliceDecipher = aliceGroup.decrypt(groupCipher)
    const cindyDecipher = cindyGroup.decrypt(groupCipher)
    console.log(groupMessage == aliceDecipher == cindyDecipher)
    > true

    // Serialization
    const serialBob = await bob.encryptSerialized()
    const serialBob = await User.decryptAndDeserialize(web3, bobAccount, serialBob)
    const serialBobGroup = serialBob.groupManager.getGroup('abc-group')
    const serialBobDecipher = serialBobGroup.decrypt(groupCipher)
    console.log(serialBobDecipher == groupMessage)
    > true
	
	

    

# Classes & Functions
## KeyManager
### generateKeyPair()
Creates a random ecdh keypair (secp256k1), stores it in the KeyManager, and sets the pubKey value on the parent User.

### recoverKeyPair(pvtKey)
Recreates the ecdh keypair from the private key, stores it in the KeyManager, and sets the pubKey value on the parent User.

### signPublicKey()
Creates a signature of the ecdh public key using the User's Ethereum address.
Returns:

    {
	    address, // ethereum address of parent
	    pubKey, // public key of ecdh keypair
	    pubKeySignature // signature of pubKey from address
    }
    
### getPrivateKey()
Returns hex encoded private key of ecdh keypair.

### encryptPersonal(data)
Encrypts data using web3-encrypt library's web3Encrypt method with the parent User's Ethereum address.

### decryptPersonal(cipher)
Decrypts the cipher using web3-encrypt library's web3Decrypt method with the parent User's Ethereum address.

### getKeyBind(address)
Returns stored ecdh public key associated with an Ethereum address.

### addKeyBind(keySignature)
 **keySignature:**
- `address - Ethereum address`
- `pubKey - ecdh public key`
- `pubKeySignature - signature of pubKey from address`

Verifies the signature of a pubkey for a given address, then saves it in the keybind storage.
Throws if the key manager has already stored a different pubKey for the given address or the signature is invalid.

#### encryptFor(msg, address)
Looks up the saved ecdh key for the given address and encrypts msg using computed shared secret between the found public key and the parent User's private key.

#### decryptFrom(cipher, address)
Looks up the saved ecdh key for the given address and decrypts cipher using computed shared secret between the found public key and the parent User's private key.

## User
User objects have child KeyManager and GroupManager objects. They hold the web3 instance and web3 account.

### new User(web3, account)
Creates a new User object and generates a keypair using child KeyManager.

### encryptSerialized()
Serializes the stored group keys and address->ecdh key bindings, then encrypts it using personalEncrypt.

### User.decryptAndDeserialize(web3, account, serialCipher)
Decrypts serialCipher, then deserializes it and returns a new User with the serialized data.

### encryptPrivateKey()
Encrypts the ecdh private key using encryptPersonal. This can be used instead of full serialization to avoid frequent updates, though it would require that the server store all group invites indefinitely.

## Group
### new Group(key)
Sets the group key to key if given or a random hex value if not given.

### encrypt(msg)
Encrypts the message with the group symmetric key.

### decrypt(cipher)
Decrypts the message with the group symmetric key.

## GroupManager
Stores group keys.
### createGroup(id)
Creates a new group with a random symmetric key and stores it with the given id.

### getGroup(id)
Returns the group object for id from storage.

### setGroup(id, group)
Sets the group for a given ID, primarily used for serialization.

### createInvite(id, address)
Encrypts the group key for the given ID using keyManager.encryptFor.
**groupInvite:**

    {
	    groupId, // id of the group
	    keyCipher, // encrypted group key
	    ownerAddress // ethereum address of inviting user
    }

### joinGroup(groupInvite, ownerPubkeySignature)
Decrypts the group key using keyManager.decryptFrom and stores the group. 
ownerPubKey must be supplied if the user has not already saved the owner's key binding locally.
If ownerPubKeySignature is supplied, runs keyManager.addKeybind before accepting the invite.
 

