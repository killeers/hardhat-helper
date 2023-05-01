const {
    Attach,
    Accounts,
    BigNumber,
    Hex,
    ImportAddress,
    SendBNB
} = require('../deployed')

const e18 = BigNumber.from(Hex(1e18))

let tx;
async function main() {

    const account = await Accounts()
    const usdtAdmin = await ImportAddress("0x1111111...")
    const usdt = await Attach.USDT()
    const user = "0x222222..."

    tx = await usdt.connect(usdtAdmin).transfer(user, e18.mul(100000))
    console.log(tx.hash)
    await tx.wait()

    await SendBNB(account[0], user, e18.mul(10))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});