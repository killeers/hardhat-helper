const { ethers, upgrades, network } = require("hardhat");

const deployed = require("./deployed-"+network.config.chainId+".json")

const {BigNumber} = ethers


function FloatE18(floatString) {
    floatString = floatString + ''
    if ( isNaN(floatString) ) throw "float error"
    const [integer, decimal] = floatString.split('.')
    const intBigE18 = BigNumber.from(integer).mul(DecimalHex)
    if (!decimal) return intBigE18
    const deLen = decimal.length
    if ( deLen > 18 ) throw "float overflow"
    const floatBigE18 = BigNumber.from(10).pow(18 - deLen).mul(decimal)
    return intBigE18.add(floatBigE18)
}


function BigToFloat(big, decimal = 18) {
    big = big + ''
    if (big instanceof BigNumber) big = big.toString()
    if ( isNaN(big) ) throw "big error"

    const sLen = big.length

    if ( sLen <= decimal ) {
        const deStr = big.replace(/0+$/,'')
        return deStr === '' ? '0' : '0.' + '0'.repeat( decimal - sLen ) + deStr
    }

    let intStr = big.slice(0, sLen - decimal)
    intStr = intStr.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")

    let intDecimal = big.slice(sLen - decimal)

    const deLen = intDecimal.length
    
    intDecimal = intDecimal.replace(/0+$/,'')
    intDecimal = intDecimal === '' ? '' : '.' + '0'.repeat( decimal - deLen ) + intDecimal
    
    return intStr + intDecimal
}

function ForBig(big, call = v => v) {
    if ( big instanceof BigNumber ) {
        return call(big.toString())
    }

    if (  big instanceof Object ) {
        let obj = big instanceof Array ?[]:{}
        for(let k in big ) {
            obj[k] = ForBig(big[k], call)
        }
        return obj
    }
    return call(big.toString())
}

const Hex = num => {
    const h = num.toString(16)
    return '0x' + (h.length % 2 === 1?'0':'') + num.toString(16)
}

const DecimalHex = Hex(1e18)

const MaxInit = '0x'+'f'.repeat(64)

const ZeroAddress = "0x" + '0'.repeat(40)

const Sleep = (s) => new Promise((r,j) => setTimeout(r, s))

let _accounts;
async function Accounts() {
    if ( _accounts ) return _accounts
    _accounts = await ethers.getSigners()
    return _accounts 
}

let _contract = {};
let _contractFactory = {};

async function getContractFactory(contractName) {
    if ( !_contractFactory[contractName] ) {
        _contractFactory[contractName] = await ethers.getContractFactory(contractName)
    }
    return _contractFactory[contractName];
}

async function attach(contractName, address) {
    if ( !_contract[address] ) {
        let contract = await getContractFactory(contractName)
        contract = contract.attach(address)
        contract.calls = new Proxy({}, {
            get(_, key) {
                return (...arg) => {
                    const met = [
                        contract.address,
                        contract.interface.encodeFunctionData(key, arg)
                    ]
                    met._isMethods = true
                    met.decode = hex => {
                        const ed = contract.interface.decodeFunctionResult(key, hex)
                        return ed.length <= 1 ? ed[0] : ed
                    }
                    return met
                }
            }
        });
        _contract[address] = contract
    }
    return _contract[address]
}

/////////// MultiCall ///////////
// any 
function proxy(obj, key, call) {
    Object.defineProperty(obj, key, {
        get: () => call(),
        enumerable : true,
        configurable : false
    })
}

async function MultiCall() {
    const multiCall = await attach("MultiCall", deployed.ContractAt.MultiCall)
    multiCall.callArr = async (callsArg, op = {}) => {
        const calRes = await multiCall.callStatic.aggregate(callsArg, op)
        return calRes.returnData.map((v,i) => callsArg[i].decode(v))
    }
    multiCall.callObj = async (methodsObj, op = {}) => {
        // cache encodeABI
        let calls = []
        let pro = []
        // cache callsIndex
        const callsIndex = methodsObj instanceof Array?[]:{}

        function analyze(methods, parentObj, key) {
            if ( methods._isMethods) {
                const index = calls.length
                calls.push(methods)
                proxy(parentObj, key, () => {
                    return methods.decode(calls[index])
                })
            }
            else if ( methods instanceof Promise ) {
                const index = pro.length
                pro.push(methods)
                proxy(parentObj, key, () => pro[index])
            }
            else if ( methods instanceof BigNumber ) {
                parentObj[key] = methods
            }
            else if ( methods instanceof Object ) {
                parentObj[key] = methods instanceof Array?[]:{}
                for(let index in methods) {
                    analyze(methods[index], parentObj[key], index)
                }
            }
            else {
                parentObj[key] = methods
            }
        }

        for(let key in methodsObj) {
            analyze(methodsObj[key], callsIndex, key)
        }

        calls = (await multiCall.callStatic.aggregate(calls, op)).returnData
        if ( pro.length > 0 ) pro = await Promise.all(pro)
        return callsIndex        
    }
    return multiCall
}


const minGas = BigNumber.from('105000000000000')
async function SendBNB(fromSigner, toAddress, amountBig, op = {}) {
    if ( amountBig === 'all' ) {
        const balance = await BnbBalance(fromSigner.address)
        amountBig = balance.sub(minGas)
    }
    tx = await fromSigner.sendTransaction({
        to: toAddress,
        value: amountBig,
        ...op
    })
    console.log(fromSigner.address, " send BNB to ", toAddress, " on ", tx.hash)
    await tx.wait()
}


function CallBNB(fromSigner, toAddress, inputABI, outputType) {
    return fromSigner.provider.call(
        {
            from: fromSigner.address,
            to: toAddress,
            data: inputABI
        }
    ).then( hex => {
        return outputType ? DecodeABI(outputType, hex) : hex
    })
}

function EstimateGas(fromSigner, toAddress, inputABI) {
    return fromSigner.provider.call(
        {
            from: fromSigner.address,
            to: toAddress,
            data: inputABI
        }
    )
}

// types => ["uint","address"]
// dataArray = [[123, "0x111111"]]
function MethodsEncodeABI(methodsName, types, dataArray) {
    if (isNaN(methodsName * 1) ) methodsName = (ethers.utils.solidityKeccak256(["string"], [methodsName])).slice(0,10)
    return ethers.utils.defaultAbiCoder.encode(types, dataArray).replace("0x",methodsName)
}

function EncodeABI(types, dataArray) {
    return ethers.utils.defaultAbiCoder.encode(types, dataArray)
}

function DecodeABI(types, hex) {
    return ethers.utils.defaultAbiCoder.decode(types, hex)
}

function BnbBalance(address) {
    return ethers.provider.getBalance(address)
}

// deploy contract by deployed json

// deployed.ContractAt

function ERC20(address) {
    return attach("TestCoin", address)
}

function Pair(address) {
    return attach("MockUniswapV2FactoryUniswapV2Pair", address)
}

async function Deploy(contractName, ...arg) {
    let dep = await getContractFactory(contractName)
    console.log(...arg)
    dep = await dep.deploy(...arg)
    console.log(contractName, " deployed to ", dep.address )
    return attach(contractName, dep.address)
}

async function DeployProxy(contractName, arg, config ) {
    let dep = await getContractFactory(contractName)
    dep = await upgrades.deployProxy(dep, arg, config);
    await dep.deployed();
    console.log(contractName, " deployed to ", dep.address )
    return attach(contractName, dep.address)
}

async function UpProxy(contractName, address) {
    address = address || deployed.ContractAt[contractName]
    if (!address) throw contractName + ' not address';
    let dep = await getContractFactory(contractName)
    dep = await upgrades.upgradeProxy(address, dep);
    console.log(contractName, " deployed to ", dep.address )
    return attach(contractName, dep.address)
}


const Attach = new Proxy({}, {
    get: function(_, contactName) {
        const getAttach = address => {
            if ( !address ) {
                address = deployed.ContractAt[contactName]
            }
            if ( !address ) throw(contactName, " address error")
            return attach(contactName, address)
        }
        getAttach.Deploy = (...arg) => Deploy(contactName, ...arg)
        getAttach.DeployProxy = (arg, config) => DeployProxy(contactName, arg, config)
        getAttach.UpProxy = (address) => UpProxy(contactName, address)
        return getAttach
    }
});

async function DeploySwap(freeToAddress) {
    const WETH = await Deploy("WETH")
    const factory = await Deploy("UniFactory", freeToAddress)
    const router = await Deploy("Router", factory.address, WETH.address)

    return {
        WETH,
        factory,
        router
    }
}

async function SetBlockTime(seconds) {
    try {
        await network.provider.send("evm_setNextBlockTimestamp", [seconds])
        await network.provider.send("evm_mine")
    } catch (error) {
        console.log("Network not support SetBlockTime")
    }
    
}

async function AddBlockTime(seconds) {
    try {
        await network.provider.send("evm_increaseTime", [seconds])
        await network.provider.send("evm_mine")
    } catch (error) {
        console.log("Network not support AddBlockTime")
    }
}

// impersonate account only for hardhat network
let signers = {}
async function _ImportAddress(address) {
    const provider = process.env.IN_FORK === 'true' ? network.provider : new ethers.providers.JsonRpcProvider(network.config.url);
    await provider.send("hardhat_impersonateAccount", [address]);
    return ethers.provider.getSigner(address); 
}
async function ImportAddress(address) {
    address = address.toLocaleLowerCase()
    if (!signers[address]) {
        signers[address] = await _ImportAddress(address) 
        signers[address].address = address
    }
    return signers[address]
    
}


function getNonce(addr) {
    return ethers.provider.getTransactionCount(addr)
}

function _getAdmin() {
    return upgrades.admin.getInstance()
}

// change admin single
async function ChangeAdmin(contractAddress , newAdmin, signer) {
    const _admin = await _getAdmin()
    if ( signer ) {
        return _admin.connect(signer).changeProxyAdmin(contractAddress, newAdmin)
    } else {
        return _admin.changeProxyAdmin(contractAddress, newAdmin)
    }
}

// change admin all
async function ChangeAll(newAdmin, signer) {
    const _admin = await _getAdmin()
    if ( signer ) {
        return _admin.connect(signer).transferOwnership(newAdmin)
    } else {
        return _admin.transferOwnership(newAdmin)
    }
}

function GetMnemonic(id = 0,path = network.config.accounts.path + '/') {
    const hdnode = ethers.utils.HDNode.fromMnemonic(network.config.accounts.mnemonic, network.config.accounts.passphrase);
    return hdnode.derivePath(path + id);
}


module.exports = {
    ForBig,
    Sleep,
    Hex,
    Accounts,
    BnbBalance,
    SendBNB,
    MultiCall,
    ERC20,
    Pair,
    Deploy,
    DeployProxy,
    UpProxy,
    EncodeABI,
    DecodeABI,
    MethodsEncodeABI,
    CallBNB,
    EstimateGas,
    DeploySwap,
    SetBlockTime,
    AddBlockTime,
    ImportAddress,
    FloatE18,
    BigToFloat,
    getNonce,
    ChangeAdmin,
    ChangeAll,
    GetMnemonic,
    ethers,
    ZERO_ADDRESS: ZeroAddress,
    DEPLOYED: deployed,
    ATTACH: Attach,
    Attach,
    E18: DecimalHex,
    DecimalHex,
    MAX256: MaxInit,
    MaxInit,
    BigNumber,
    BN: BigNumber
}