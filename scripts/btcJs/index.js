const {ECPairFactory} = require('ecpair')
const ecc = require('tiny-secp256k1')
const qrcode = require('qrcode-terminal')
const bitcoin = require('bitcoinjs-lib');
// const { p2wsh } = require('bitcoinjs-lib/src/payments');
const { ethers, upgrades, network } = require("hardhat");

const ECPair = ECPairFactory(ecc);

function _getPair(sKeyStr) {
    const pKeyBuffer = Buffer.from(sKeyStr.replace('0x',''), 'hex')
    const keyPair = ECPair.fromPrivateKey(pKeyBuffer)
    return keyPair 
}
// m/1231'/0'/123'/0/
function _getMnemonic(id,path = "m/44'/0'/0'/0/") {
    return ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, path + id)._signingKey()
}

function PrivateKeyToWIF(sKeyStr) {
    const keyPair = _getPair(sKeyStr)
    const wif = keyPair.toWIF()

    // 二维码
    // qrcode.generate(keyPair.toWIF());
    qrcode.generate(wif)

    return keyPair.wif
}

function SegWitAddress(sKeyStr) {
    const keyPair = _getPair(sKeyStr)
    return bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });
}

function SegWitP2SHAddress(sKeyStr) {
    const keyPair = _getPair(sKeyStr)
    return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }),
      })
}

const _acc = {}
// acc 
// {
//     p2pk,
//     p2sh,
//     p2wsh,
// }
function BtcAccounts(path) {
    
}

module.exports = {
    SegWitAddress,
    PrivateKeyToWIF,
    SegWitP2SHAddress
}