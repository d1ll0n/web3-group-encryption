const crypto = require('crypto')
const { encrypt, decrypt } = require('web3-encrypt')

const randomHex = (size = 64) => crypto.randomBytes(size).toString('hex')

const jsonPrepend = 'þâßÛ'

class Group {
  constructor(key) {
    this.key = key || randomHex()
  }

  encrypt(msg) {
    const data = typeof msg == 'string' ? msg : jsonPrepend + JSON.stringify(msg)
    return encrypt(data, this.key)
  }

  decrypt(cipher) {
    const decipher = decrypt(cipher, this.key)
    if (decipher.indexOf(jsonPrepend) == 0) return JSON.parse(decipher.replace(jsonPrepend, ''))
    return decipher
  }
}

class GroupManager {
  constructor(user) {
    this.user = user
    this.keyManager = user.keyManager
    this.groups = {}
  }

  serializeGroups() {
    return Object.keys(this.groups).map(groupId => ({
      groupId,
      key: this.getGroup(groupId).key
    }))
  }

  deserializeGroups(groups) {
    for (const group of groups) {
      const {groupId, key} = group
      this.setGroup(groupId, new Group(key))
    }
  }

  getGroup(id) {return this.groups[id]}
  setGroup(id, group) {
    if (this.getGroup(id)) throw new Error('Group already exists')
    this.groups[id] = group
  }

  createGroup(id) {
    const group = new Group()
    this.setGroup(id, group)
    return group
  }

  createInvite(id, address) {
    const key = this.getGroup(id).key
    const keyCipher = this.keyManager.encryptFor(key, address)
    return {
      groupId: id,
      keyCipher,
      ownerAddress: this.user.address
    }
  }

  joinGroup(groupInvite, ownerPubkeySignature) {
    if (ownerPubkeySignature) this.keyManager.addKeybind(ownerPubkeySignature)
    const { keyCipher, groupId, ownerAddress } = groupInvite
    const groupKey = this.keyManager.decryptFrom(keyCipher, ownerAddress)
    const group = new Group(groupKey)
    this.setGroup(groupId, group)
    return group
  }
}

module.exports = GroupManager
