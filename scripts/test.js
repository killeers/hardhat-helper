const {
    Attach,
    Accounts,
    MethodsEncodeABI,
    DecodeABI,
    CallBNB
} = require('./deployed')

async function main() {
    
    const accounts = await Accounts()

    console.log(
        await CallBNB(
            accounts[0],
            "0x111111...",
            MethodsEncodeABI("name()",[],[]),
            ["string"]
        )
    )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});