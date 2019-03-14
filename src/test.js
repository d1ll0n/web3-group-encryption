const { constructWeb3 } = require('web3-encrypt')
const { expect } = require('chai')
const User = require('./models/User')

const web3 = constructWeb3('https://mainnet.infura.io/v3');



describe('Running tests!', () => {
  describe('Encryption test', () => {
    it('Should encrypt and decrypt a message between two users', async () => {
      const bobW3 = web3.eth.accounts.create()
      const aliceW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const bobKeysig = await bob.keyManager.signPublicKey()
      const alice = new User(web3, aliceW3)
      const aliceKeySig = await alice.keyManager.signPublicKey()
      bob.keyManager.addKeybind(aliceKeySig)
      alice.keyManager.addKeybind(bobKeysig)
      const message = "hello alice!"
      const msgCipher = bob.keyManager.encryptFor(message, alice.address)
      const msgDecipher = alice.keyManager.decryptFrom(msgCipher, bob.address)
      expect(msgDecipher).to.eql(message)
    })

    it('Should reject an invalid signature', async () => {
      const bobW3 = web3.eth.accounts.create()
      const aliceW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const bobKeysig = await bob.keyManager.signPublicKey()
      const alice = new User(web3, aliceW3)
      const badAccount = web3.eth.accounts.create()
      bobKeysig.address = badAccount.address
      try {
        alice.keyManager.addKeybind(bobKeysig)
        throw new Error()
      } catch(e) {}
    })
  })

  describe('Group tests', () => {
    it('should create a group and accept an invite to the group', async () => {
      const bobW3 = web3.eth.accounts.create()
      const aliceW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const bobKeysig = await bob.keyManager.signPublicKey()
      const alice = new User(web3, aliceW3)
      const aliceKeySig = await alice.keyManager.signPublicKey()
      bob.keyManager.addKeybind(aliceKeySig)
      const group = bob.groupManager.createGroup('cool-group')
      const invite = bob.groupManager.createInvite('cool-group', alice.address)
      const joinedGroup = await alice.groupManager.joinGroup(invite, bobKeysig)      
      expect(group.key).to.eql(joinedGroup.key)
    })

    it('should exchange messages within a group', async () => {
      const bobW3 = web3.eth.accounts.create()
      const aliceW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const bobKeysig = await bob.keyManager.signPublicKey()
      const alice = new User(web3, aliceW3)
      const aliceKeySig = await alice.keyManager.signPublicKey()
      bob.keyManager.addKeybind(aliceKeySig)
      const group = bob.groupManager.createGroup('cool-group')
      const invite = bob.groupManager.createInvite('cool-group', alice.address)
      const joinedGroup = await alice.groupManager.joinGroup(invite, bobKeysig)
      const message = "welcome to the group!"
      const msgCipher = group.encrypt(message)
      const deciphered = joinedGroup.decrypt(msgCipher)
      expect(deciphered).to.eql(message)
      const message2 = "thanks for the invite"
      const msgCipher2 = joinedGroup.encrypt(message2)
      const deciphered2 = group.decrypt(msgCipher2)
      expect(deciphered2).to.eql(message2)
    })
  
    it('should reject a duplicate id', async () => {
      const bobW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      bob.groupManager.createGroup('cool-group')
      try {
        bob.groupManager.createGroup('cool-group')
        throw new Error()
      } catch(e) {}
    })
  })

  describe('serialization tests', () => {
    it('should serialize and deserialize a user', async () => {
      const bobW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const serialCipher = await bob.encryptSerialized()
      const bobRecovered = await User.decryptAndDeserialize(web3, bobW3, serialCipher)
      expect(bobRecovered.pubKey).to.eql(bob.pubKey)
    })

    it('should use group keys from deserialized user', async () => {
      const bobW3 = web3.eth.accounts.create()
      const aliceW3 = web3.eth.accounts.create()
      const bob = new User(web3, bobW3)
      const bobKeysig = await bob.keyManager.signPublicKey()
      const alice = new User(web3, aliceW3)
      const aliceKeySig = await alice.keyManager.signPublicKey()
      bob.keyManager.addKeybind(aliceKeySig)
      const group = bob.groupManager.createGroup('cool-group')
      const invite = bob.groupManager.createInvite('cool-group', alice.address)
      const joinedGroup = await alice.groupManager.joinGroup(invite, bobKeysig)
      const message = 'hello bob from the future!'
      const msgCipher = joinedGroup.encrypt(message)
      const serialCipher = await bob.encryptSerialized()
      const bobRecovered = await User.decryptAndDeserialize(web3, bobW3, serialCipher)
      const groupRecovered = bobRecovered.groupManager.getGroup('cool-group')
      const deciphered = groupRecovered.decrypt(msgCipher)
      expect(deciphered).to.eql(message)
    })
  })
})
