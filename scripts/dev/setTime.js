const {
    SetBlockTime
} = require('../deployed')

async function main() {
    await SetBlockTime(Math.floor(new Date() / 1000))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});