const KeyManager = require('./KeyManager')
const GroupManager = require('./GroupManager')

class User {
  constructor(web3, account) {
    this.account = account
    this.web3 = web3
    this.address = account.address || account
    this.keyManager = new KeyManager(this)
    this.groupManager = new GroupManager(this)
    this.keyManager.generateKeypair()
  }

  static async decryptAndDeserialize(web3, account, serialCipher) {
    const newUser = new User(web3, account)
    const {keyBinds, groups, privateKey} = await newUser.keyManager.decryptPersonal(serialCipher)
    newUser.keyManager.recoverKeypair(privateKey)
    newUser.keyManager.keyBinds = keyBinds
    newUser.groupManager.deserializeGroups(groups)
    return newUser
  }

  encryptSerialized() {
    const keyBinds = this.keyManager.keyBinds
    const groups = this.groupManager.serializeGroups()
    const privateKey = this.keyManager.getPrivateKey()
    const serialized = JSON.stringify({
      keyBinds,
      groups,
      privateKey
    })
    return this.keyManager.encryptPersonal(serialized)
  }

  encryptPrivateKey() {
    const pvtKey = this.keyManager.getPrivateKey()
    return this.keyManager.encryptPersonal(pvtKey)
  }
}

module.exports = User