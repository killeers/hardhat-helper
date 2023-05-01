const { ethers, upgrades, network } = require("hardhat");

const {
    Attach,
    Accounts,
    MethodsEncodeABI,
    DecodeABI,
    CallBNB,
    DecimalHex

} = require('../deployed')

const e18 = ethers.BigNumber.from(10).pow(18)
async function main() {
    // console.log(network)
    const accounts = await Accounts()
    const usdt = await Attach.USDT()
    
    console.log(
        accounts[0].address,
        accounts[1].address,
        accounts[2].address,
        accounts[3].address,
        accounts[4].address,
        accounts[5].address,
        accounts[6].address,
        accounts[7].address,
        accounts[8].address,
    )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});