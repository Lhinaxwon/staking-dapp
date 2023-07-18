"use client"
import React, { useState, useEffect } from 'react';
import { RainbowKitProvider, connectorsForWallets, ConnectButton } from '@rainbow-me/rainbowkit';
import { injectedWallet, walletConnectWallet, metaMaskWallet } from '@rainbow-me/rainbowkit/wallets';
import {
  useAccount,
  configureChains,
  createConfig,
  WagmiConfig,
  useContractRead,
  useContractReads,
  useContractWrite,
  usePrepareContractWrite,
  useContractEvent
} from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@rainbow-me/rainbowkit/styles.css';
import { tnt721ABI, stakingTNT20ABI } from '@/ABI';


const TNT20_CONTRACT = '0x644B6533038DA0Ee6c330f51A16940139bbbE50B'
const TNT721_CONTRACT = '0x045eE648e4BBAb1b1bcBe95B60e76C9A8143488f';
const projectID = 'dd478956ed8fe16445b6b8690dd45f06';

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

const { chains, publicClient } = configureChains([theta], [publicProvider()]);

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ projectId: projectID, chains }),
      injectedWallet({ chains }),
      walletConnectWallet({ projectId: projectID, chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

const contractConfigTNT721 = {
  address: TNT721_CONTRACT,
  abi: tnt721ABI,
}

const contractConfigTNT20  = {
  address: TNT20_CONTRACT,
  abi: stakingTNT20ABI,
}

// Shows NFTs that are in the Users Wallet
function UserNFT(token: {id: number, uri: string, img: string}) {

  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { config: approveConfig } = usePrepareContractWrite({
    address: TNT721_CONTRACT,
    abi: tnt721ABI,
    functionName: 'approve',
    args: [TNT20_CONTRACT,token.id],
    onSuccess(data) {
      if(data.result) {
        console.log(data.result)
        setIsApproved(true);
        setIsLoading(false);
      }
    },
    onError() {
      setIsApproved(false);
      setIsLoading(false);
    }
  });

  useContractEvent({
    address: TNT721_CONTRACT,
    abi: tnt721ABI,
    eventName: 'approved',
    listener(log) {
      // console.log(log)
      setIsApproved(true);
      setIsLoading(false);
    },
  })

  // useContractEvent({
  //   address: TNT721_CONTRACT,
  //   abi: tnt721ABI,
  //   eventName: 'approved',
  //   listener(log) {
  //     // console.log(log)
  //     setIsApproved(true);
  //     setIsLoading(false);
  //   },
  // })

  const { config: stakeConfig } = usePrepareContractWrite({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'stake',
    args: [token.id]
  });

  const { data: approveData, write: writeApprove } = useContractWrite(approveConfig);
  const { data: stakeData, write: writeStake } = useContractWrite(stakeConfig);


  return (
      <div
          style={{
            height: '50px',
            background: '#d2d2d2',
            borderRadius: '10px',
            width: '95%',
            marginBottom: '5px',
            minWidth: '350px',
          }}
      >
        <div className="row row-cols-3 justify-content-between" style={{ height: '50px' }}>
          <div className="col-xl-1" style={{ width: '50px' }}>
            <img
                src={token.img}
                style={{ width: '40px', height: '40px', margin: '5px', borderRadius: '5px' }}
                alt="NFT"
            />
          </div>
          <div className="col-xl-6">
            <div className="d-flex justify-content-start align-items-center" style={{ height: '50px' }}>
              <p className="text-center" style={{ marginBottom: '0px' }}>
                {token.id}
              </p>
            </div>
          </div>
          <div className="col">
            <div className="d-flex justify-content-end align-items-center" style={{ height: '50px' }}>
              {isLoading ?
                  (
                      <div className="d-flex justify-content-center align-items-center" style={{ height: '50px', minWidth: '150px', marginRight: '10px' }}>
                        <div className="spinner-border" role="status">
                          <span className="sr-only"></span>
                        </div>
                      </div>
                  ):
                  isApproved ? (
                          <div className="d-flex justify-content-around align-items-center" style={{ height: '50px', minWidth: '150px', marginRight: '10px' }}>
                            <button className="btn btn-secondary" type="button" style={{ marginRight: '10px' }} onClick={() =>{
                              setIsLoading(true);
                              writeStake?.()
                            }}>
                              Stake
                            </button>
                          </div>
                      ) : (
                      <div className="d-flex justify-content-around align-items-center" style={{ height: '50px', minWidth: '150px', marginRight: '10px' }}>
                        <button className="btn btn-secondary" type="button" style={{ marginRight: '0px' }} onClick={() => {
                          setIsLoading(true);
                          writeApprove?.()
                        }}>
                          Approve
                        </button>
                      </div>
                  )
              }
            </div>
          </div>
        </div>
      </div>
  );
}

function UserStakedNFT(token: {id: number, uri: string, img: string}) {
  const [tokenReward, setTokenReward] = useState(0);

  const { data, isError } = useContractRead({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'calculateRewards',
    args: [token.id],
    watch: true,
  })

  useEffect(() => {
    console.log(data)
    setTokenReward(Number((data ? BigInt(data.toString()) : BigInt('0')) / BigInt('10000000000000000'))/100);
  }, []);

  const { config: claimConfig } = usePrepareContractWrite({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'claimRewards',
    args: [token.id]
  })

  const { config: unstakeConfig } = usePrepareContractWrite({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'unstake',
    args: [token.id]
  })

  const { data: claimData, isLoading: isLoadingClaim, write: writeClaim } = useContractWrite(claimConfig);
  const { data: unstakeData, isLoading: isLoadingUnstake, write: writeUnstake } = useContractWrite(unstakeConfig);


  return (
      <div
          style={{
            height: '50px',
            background: '#d2d2d2',
            borderRadius: '10px',
            width: '95%',
            marginBottom: '5px',
            minWidth: '350px',
          }}
      >
        <div className="row gx-0 row-cols-4 justify-content-between" style={{ height: '50px' }}>
          <div className="col-xl-1" style={{ width: '50px' }}>
            <img
                src={token.img}
                style={{ width: '40px', height: '40px', margin: '5px', borderRadius: '5px' }}
                alt="NFT"
            />
          </div>
          <div className="col-1 col-xl-2">
            <div className="d-flex float-start justify-content-start align-items-center" style={{ height: '50px' }}>
              <p className="text-center" style={{ marginBottom: '0px' }}>
                {token.id}
              </p>
            </div>
          </div>
          <div className="col-xl-3">
            <div className="d-flex justify-content-start align-items-center" style={{ height: '50px' }}>
              <p className="text-center" style={{ marginBottom: '0px' }}>
                {tokenReward} TEST
              </p>
            </div>
          </div>
          <div className="col order-last" style={{ minWidth: '160px' }}>
            {isLoadingClaim || isLoadingUnstake ?
                (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '50px', minWidth: '150px', marginRight: '10px' }}>
                      <div className="spinner-border" role="status">
                        <span className="sr-only"></span>
                      </div>
                    </div>
                ):
                (
                    <div className="d-flex justify-content-around align-items-center" style={{ height: '50px', minWidth: '150px', marginRight: '10px' }}>
                      <button className="btn btn-secondary" type="button" style={{ marginRight: '2px' }} onClick={() =>writeClaim?.()}>
                        Claim
                      </button>
                      <button className="btn btn-secondary" type="button" style={{ marginLeft: '2px' }} onClick={() => {writeUnstake?.()}}>
                        Unstake
                      </button>
                    </div>
                )
            }
          </div>
        </div>
      </div>
  );
}

function UserData({ address }: { address: string }) {
  const [myNFTs, setMyNFTs] = useState(0);
  const [myTokens, setMyTokens] = useState<{ id: number; uri: string; img: string; }[]>([]);
  const [userStakedTokens, setUserStakedTokens] = useState<{ id: number; uri: string; img: string; }[]>([]);


  const { data, isError, isLoading } = useContractReads({
    contracts: [
      // @ts-ignore
      {
        ...contractConfigTNT20,
        functionName: 'stakedBalanceOf',
        args: [address],
      },
      // @ts-ignore
      {
        ...contractConfigTNT721,
        functionName: 'balanceOf',
        args: [address],
      },
    ],
    watch: true,
  })
  let contracts = [];
  let ownerAmount: number = data && data[1].result ? Number(data[1].result) : 0;
  for(let i = 0; i<ownerAmount; i++) {
    contracts.push({
      ...contractConfigTNT721,
      functionName: 'tokenOfOwnerByIndex',
      args: [address, i],
    })
  }


  const { data: tokenIds } = useContractReads({
    // @ts-ignore
    contracts: contracts,
    watch: true,
  });

  contracts = [];
  if(tokenIds) {
    for(let i = 0; i<tokenIds?.length; i++) {
      contracts.push({
        ...contractConfigTNT721,
        functionName: 'tokenURI',
        args: [tokenIds[i].result],
      })
    }
  }

  const { data: tokenURIs } = useContractReads({
    // @ts-ignore
    contracts: contracts,
  })

  let tokens: {id: number, uri: string, img: string}[] = [];
  if(tokenURIs && tokenIds) {
    for(let i = 0; i<tokenURIs?.length; i++) {
      tokens.push({
        id: Number(tokenIds[i].result),
        uri: tokenURIs[i].result as string,
        img: '',
      })
    }
  }

  contracts = [];
  let ownerStakedAmount: number = data && data[0].result ? Number(data[0].result) : 0;
  for(let i = 0; i<ownerStakedAmount; i++) {
    contracts.push({
      ...contractConfigTNT20,
      functionName: 'stakedTokenOfOwnerByIndex',
      args: [address, i],
    })
  }

  const { data: stakedTokenIds } = useContractReads({
    // @ts-ignore
    contracts: contracts,
    watch: true,
  })

  contracts = [];
  if(stakedTokenIds) {
    for(let i = 0; i<stakedTokenIds?.length; i++) {
      contracts.push({
        ...contractConfigTNT721,
        functionName: 'tokenURI',
        args: [stakedTokenIds[i]?.result],
      })
    }
  }

  const { data: stakedTokenURIs  } = useContractReads({
    // @ts-ignore
    contracts: contracts,
  })

  let stakedTokens: {id: number, uri: string, img: string}[] = [];
  if(stakedTokenURIs && stakedTokenIds) {
    for(let i = 0; i<(stakedTokenURIs ? stakedTokenURIs : []).length; i++) {
      stakedTokens.push({
        id: Number(stakedTokenIds[i]?.result),
        uri: stakedTokenURIs[i]?.result as string,
        img: '',
      })
    }
  }


  useEffect(()=>{
    const fetchTokens = async () => {
      try {
        const updatedTokens = await Promise.all(
            tokens.map(async (token) => {
              const uriResponse = await fetch(token.uri);
              const uriData = await uriResponse.json();
              const imageUrl = uriData.image;
              return {
                id: token.id,
                uri: token.uri,
                img: imageUrl,
              };
            })
        );
        setMyTokens(updatedTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    };
    const fetchStakedTokens = async () => {
      try {
        const updatedTokens: {
          id: number,
          uri: string,
          img: string,
        }[] = await Promise.all(
            stakedTokens.map(async (token) => {
              const uriResponse = await fetch(token.uri);
              const uriData = await uriResponse.json();
              const imageUrl = uriData.image;
              return {
                id: token.id,
                uri: token.uri,
                img: imageUrl,
              };
            })
        );
        setUserStakedTokens(updatedTokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }
    };
    fetchTokens();
    fetchStakedTokens();
    setMyNFTs(parseInt(`${data ? data[0].result : 0}`));
  }, [address])

  return (
      <><h6 className="text-center" style={{ paddingBottom: '10px', color: 'gray' }}>
          My number of NFTs staked: {myNFTs}
        </h6>
        <div style={{ background: '#626262', height: '1px' }}></div>
        <div className="container">
          <div className="row" style={{ paddingBottom: '10px' }}>
            <div className="col-md-6">
              <h3 style={{ paddingLeft: '0px', paddingTop: '20px' }}>Your Staked NFTs:</h3>
              {userStakedTokens.map((token: {id: number, uri: string, img: string}) => (
                  <UserStakedNFT key={token.id} id={token.id} uri={token.uri} img={token.img} />
              ))}
            </div>
            <div className="col-md-6">
              <h3 style={{ paddingLeft: '0px', paddingTop: '20px' }}>NFTs in your Wallet:</h3>
              {myTokens.map((token: {id: number, uri: string, img: string}) => (
                  <UserNFT key={token.id} id={token.id} uri={token.uri} img={token.img} />
              ))}
            </div>
          </div>
        </div></>
  );
}

function YourApp() {
  const [totalNFTs, setTotalNFTs] = useState(0);
  const [connected, setConnected] = useState(false);
  const { address } = useAccount();
  const [allTokens, setAllTokens] = useState(0);

  const { data, isError } = useContractRead({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'totalSupply',
    onSuccess(data) {
      setAllTokens(Number((data ? BigInt(data.toString()) : BigInt('0')) / BigInt('10000000000000000'))/100)
    },
    watch: true,
  })

  const { data: data1 } = useContractRead({
    address: TNT20_CONTRACT,
    abi: stakingTNT20ABI,
    functionName: 'totalNFTsStaked',
    onSuccess(data) {
      setTotalNFTs(Number(data ? BigInt(data.toString()) : BigInt('0')))
    },
    watch: true,
  })

  useEffect(() => {
    if(address) {
      setConnected(true)
    } else {
      setConnected(false)
    }
  }, [address]);

  return (
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains} initialChain={361}>
          <div>
            <nav className="navbar navbar-expand-lg navbar-light bg-light justify-content-between">
              <a className="navbar-brand" href="#" style={{ paddingLeft: '10px' }}>
                Demo Staking dApp
              </a>
              <div style={{ paddingRight: '10px' }}>
                <ConnectButton />
              </div>
            </nav>
            <section style={{ width: '100%', height: '100vh' }}>
              <div style={{ background: '#626262', height: '1px' }}></div>
              <h1 className="text-center" style={{ paddingTop: '20px' }}>
                TNT20 Token current Supply
              </h1>
              <h2 className="text-center">{allTokens} TEST</h2>
              <h6 className="text-center" style={{ color: 'gray' }}>
                Total number of NFTs staked: {totalNFTs}
              </h6>
              {connected && <UserData address={address ? address.toString() : '' } />}
              <div style={{ background: '#626262', height: '1px' }}></div>
            </section>
          </div>
        </RainbowKitProvider>
      </WagmiConfig>
  );
}

function Home() {
  return (
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains} initialChain={361}>
          <YourApp />
        </RainbowKitProvider>
      </WagmiConfig>
  );
}

export default Home;