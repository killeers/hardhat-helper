const { ethers, upgrades, network } = require("hardhat");

const {
    SegWitAddress,
    SegWitP2SHAddress,
    PrivateKeyToWIF
} = require('../btcJs')


function SKey(id) {
    return ethers.Wallet.fromMnemonic(network.config.accounts.mnemonic, "m/44'/0'/0'/0/"+ id)._signingKey()
}

async function main() {

    const sAddr = []
    // for(let i = 0; i < 20; i++) {
    //     sAddr.push(SAddress(i))
    // }

    // console.log(sAddr)
    console.log(
        PrivateKeyToWIF(SKey(6).privateKey)
    )
    
    // const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

    

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});