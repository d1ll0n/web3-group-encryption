const { createECDH } = require('crypto')
const { web3Encrypt, web3Decrypt, signMsg, encrypt, decrypt } = require('web3-encrypt')
const { toBuffer, ecrecover, pubToAddress } = require('ethereumjs-utils')

class KeyManager {
  constructor(user) {
    this.user = user
    this.keyBinds = {}
  }

  generateKeypair() {
    const ecdh = createECDH('secp256k1')
    ecdh.generateKeys()
    this.ecdh = ecdh
    this.user.pubKey = ecdh.getPublicKey('hex')
  }

  recoverKeypair(pvtKey) {
    const ecdh = createECDH('secp256k1')
    ecdh.setPrivateKey(pvtKey, 'hex')
    this.ecdh = ecdh
    this.user.pubKey = ecdh.getPublicKey('hex')
  }

  getPrivateKey() {
    return this.ecdh.getPrivateKey('hex')
  }

  async signPublicKey() {
    const pubKey = this.user.pubKey
    const signature = await signMsg(this.user.web3, this.user.account, pubKey)
    return {
      address: this.user.address,
      pubKey: pubKey,
      pubKeySignature: signature.signature
    }
  }

  encryptPersonal(data) {
    return web3Encrypt(this.user.web3, this.user.account, data, this.user.address)    
  }

  decryptPersonal(cipher) {
    return web3Decrypt(this.user.web3, this.user.account, cipher, this.user.address)
  }

  verifySignature(message, signature, address) {
    return address == this.user.web3.eth.accounts.recover(message, signature, false)
  }

  getKeybind(address) {
    return this.keyBinds[address]
  }

  addKeybind({address, pubKey, pubKeySignature}) {
    if (this.getKeybind(address) && this.getKeybind(address) !== pubKey) throw new Error(`Different key for ${address} already stored.`)
    if (!address || !pubKey || !pubKeySignature) throw new Error('Address, pubKey or pubKeySignature not provided')
    const sigMatches = this.verifySignature(pubKey, pubKeySignature, address)
    if (!sigMatches) throw new Error('Signature does not match provided public key and address', {address, pubKey, pubKeySignature})
    this.keyBinds[address] = pubKey
  }

  encryptFor(msg, address) {
    const pubKey = this.getKeybind(address)
    if (!pubKey) throw new Error(`No key bound for ${address}.`)
    const secret = this.ecdh.computeSecret(pubKey, 'hex', 'hex')
    return encrypt(msg, secret)
  }

  decryptFrom(cipher, address) {
    const pubKey = this.getKeybind(address)
    if (!pubKey) throw new Error(`No key bound for ${address}.`)
    const secret = this.ecdh.computeSecret(pubKey, 'hex', 'hex')
    return decrypt(cipher, secret)
  }
}

module.exports = KeyManager
