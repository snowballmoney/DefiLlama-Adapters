const { request, gql } = require("graphql-request");

const graphUrl = 'https://graph.mirror.finance/graphql'
const mirLiquidityQuery = gql`
query liq($network: Network){
  assets{
    token
    symbol
    statistic{
      liquidity(network: $network)
    }
  }
}
`;

const tvlQuery = gql`
query statistic{
  statistic{
    totalValueLocked
    collateralRatio
  }
}
`

const ust = val=>Number(val)*1e12

function getMirLiquidity(network){
  return request(
    graphUrl,
    mirLiquidityQuery,
    {
      network,
    }
  ).then(data=> data.assets);
}

const getTotalLiq = assets => assets.reduce((acc, asset)=>acc+ust(asset.statistic.liquidity), 0)
const getPool2Liq = liq => ust(liq.find(asset=>asset.symbol==="MIR").statistic.liquidity)
const ustAddress = "0xa47c8bf37f92abed4a126bda807a7b7498661acd"

async function Terra() {
  const totalTvl = request(graphUrl,tvlQuery).then(data=>ust(data.statistic.totalValueLocked))
  const ethLiquidity = getMirLiquidity('ETH')
  const terraLiquidity = getMirLiquidity('TERRA')
  const totalEthLiquidity = getTotalLiq(await ethLiquidity)
  const pool2TerraLiq = getPool2Liq(await terraLiquidity)

  return {
    [ustAddress] : ((await totalTvl)-totalEthLiquidity-pool2TerraLiq).toFixed(0),
  }
}

async function Ethereum() {
  const ethLiquidity = getMirLiquidity('ETH')
  const totalEthLiquidity = getTotalLiq(await ethLiquidity)
  const pool2EthLiq = getPool2Liq(await ethLiquidity)

  return {
    [ustAddress]: (totalEthLiquidity-pool2EthLiq).toFixed(0)
  }
}

const getTvl = balances => Number(balances[ustAddress])
async function tvl(timestamp, block) {
  const eth = getTvl(await Ethereum())
  const terr = getTvl(await Terra())
  return {
    [ustAddress]: (eth+terr).toFixed(0)
  }
}


module.exports = {
  tvl,
  Ethereum,
  Terra
}