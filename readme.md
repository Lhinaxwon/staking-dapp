# Demo: NFT Staking dApp

In this dApp, I'll guide you on how to interact with the Theta blockchain. We'll explore a variety of technologies that 
will simplify and expedite your development process on the Theta blockchain.

To illustrate, we'll build a demo dApp that allows you to stake NFTs (TNT721, analogous to ERC721) and earn tokens 
(TNT20, same as ERC20) in return. We'll begin by examining the necessary smart contracts and learning how to use 
Edgestore for uploading your NFTs' metadata.

Once the contracts are deployed, we'll shift focus to the web app, built with React.js and Bootstrap. Here, we'll delve 
into the libraries, wagmi and WalletConnect, which enable interaction with the blockchain via your wallet.

**Disclaimer: This dApp is merely an example designed to help you understand how to interact with the Theta blockchain. 
If you intend to build a real NFT staking dApp, we recommend constructing a backend and auditing the smart contracts for 
security.**
## 1. Smart Contracts
Our NFT staking dApp requires two smart contracts:
1. TNT721 Token (NFT)
2. TNT20 Token (manages staking and mints new tokens when reward claimed)

You can find both the smart contracts in the contracts folder. For this staking dApp we modified the TNT20 smart contract
slightly to the original ERC20 contract that is normally used. 

The following functions where added:
- **stake(uint256 tokenId)**: enables an NFT owner to stake that NFT.
- **calculateRewards(uint256 tokenId)**: calculates the rewards that have been earned up to know for an staked NFTs.
- **unstake(uint256 tokenId)**: unstakes an NFT and pays out the rewards for this NFT.
- **claimRewards(uint256 tokenId)**: pays out the current rewards of a staked NFT.
- **getstakedBalanceOf(address user)**: returns how many NFTs are staked from this wallet.
- **stakedTokenOfOwnerByIndex(uint256 index)**: returns the tokenId and the rewards for an NFT.
- **getTotalNFTsStaked()**: returns how many NFTs are staked in total.

and we also added the following events:
- **event StakedNFT(uint256 indexed tokenId, address indexed owner)**
- **event UnStakedNFT(uint256 indexed tokenId, address indexed owner, uint256 reward)**
- **event ClaimedReward(uint256 indexed tokenId, address indexed owner, uint256 reward)**

The TNT721 token smart contract, which holds the NFTs, 
needs a link to a metadata file each time we mint a new NFT token.

### Upload Metadata to EdgeStore
This file (JSON) should at least contain a name and an image link. Here we will use EdgeStore, but you can upload your 
data to any server or service that allows you that. Let's head over to the ThetaLabs 
[EdgeStore website](https://dev.thetaedgestore.com) to upload an image. You'll need to connect a wallet before you can 
upload a file.

Theta EdgeStore aims to be an append-only, content-addressing, decentralized key/value storage network for the permanent 
web. It also serves as a decentralized content delivery network (dCDN) for all types of files. As of June 25th, 2023, 
it's still in its alpha phase, so please use it for testing purposes only.

After uploading an image for our NFT we create a json file and past in the following (imageURL should be replaced with 
your image url):
```json
{
    "name": "Test Token",
    "image": "imageURL"
}
```
Next upload the metadata file (json file).
### Deploy Smart Contracts
Now that everything is prepared we can deploy our smart contracts. First we start with the TNT721Token.sol contract. 
If you don't know how to deploy a smart contract you can follow this 
[guide](https://docs.thetatoken.org/docs/creating-nfts-on-theta-blockchain) just with our code. Here we can directly 
mint an NFT into our wallet with the safeMint function. Select the function and provide as "to" your wallet and as "uri" 
the link to the metadata.
The next contract we need to deploy is the TNT20 contract, here we need to pass in the TNT721 token address as "_nft".
After Deploying both contracts we are ready to look at the frontend and how to interact with the blockchain from our 
browser.

## 2. Webapp
In the following we will be looking at the specific code section in the frontend website that interact with the theta 
blockchain. We won't be looking at the general react code.

To follow along the best way is to clone the repository and run the app with:
```shell
cd frontend
node run dev
```
Getting started you need to replace these const variables in the code:
- const TNT20_CONTRACT: your TNT20 token address
- const TNT721_CONTRACT: your TNT721 token address
- const projectID: your wallet connect project id
- const tokenSymbol: TNT20 token Symbole

Probably you are asking yourself what the wallet connect project id is, for that head over to the 
[wallet connect website](https://cloud.walletconnect.com/sign-in). If you don't have a account yet, you have to sign up,
and then you can create a new project. After registering your project you will get the needed project id.

### Setup WalletConnect
Now that we have everything ready, lets look at the Theta specific code in our dApp.
```javascript
const theta = {
  id: 361,
  name: 'Theta Mainnet',
  network: 'theta',
  nativeCurrency: {
    decimals: 18,
    name: 'TFUEL',
    symbol: 'TFUEL',
  },
  rpcUrls: {
    public: { http: ['https://eth-rpc-api.thetatoken.org'] },
    default: { http: ['https://eth-rpc-api.thetatoken.org'] },
  },
  blockExplorers: {
    etherscan: { name: 'Theta Explorer', url: 'https://explorer.thetatoken.org/' },
    default: { name: 'Theta Explorer', url: 'https://explorer.thetatoken.org/' },
  },
};
```
this is the most important part, here we create a new network with all the details:
- **id:** is the network chain id
- **name:** blockchain name
- **network:** network name
- **nativeCurrency:** TFuel as this is the currency you pay gas fees on Theta.
- **rpcUrls:** we used the public rpc endpoints, they have a limit on requests per minute (you can also use your own or from a provider).
- **blockExplorers:** we use the official theta blockchain explorer.

finally we will need to register the network with wagmi:
```javascript
const { chains, publicClient } = configureChains([theta], [publicProvider()]);
```
If you want to use the theta test chain you can check for the chain specific details in the [documentation](https://docs.thetatoken.org/docs/web3-stack-metamask).

For more info how to use the wagmi library check [here](https://wagmi.sh/)