// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract StakingTNT20 is ERC20, ERC721Holder, Ownable {
    using Counters for Counters.Counter;

    // NFT contract address that can be staked
    IERC721 public nft;

    // function of rewards per hour
    uint256 public rewardsPerHour = (1 * 10 ** decimals()) / 1 hours;

    // counter of total staked NFTs
    Counters.Counter public totalNFTsStaked;

    // Mapping from tokenId to wallet address that staked the token
    mapping(uint256 => address) public ownerOfNFT;

    // Mapping from tokenId to timestamp the token was staked
    mapping(uint256 => uint256) public tokenStakedAtTimestamp; // block timestamp

    // mapping from tokenId to bool if the token is staked
    mapping(uint256 => bool) public isStaked;

    // Mapping from wallet address to balance of how many NFTs this wallet staked
    mapping(address => uint256) public stakedBalanceOf;

    // Mapping from owner to list of owned token IDs
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;

    // Mapping from token ID to index of the owner tokens list
    mapping(uint256 => uint256) private _ownedTokensIndex;


    /**
     * @dev Constructor called once when deploying the smart contract
     * @param _nft is the address of the NFT smart contract which can be staked here
     */
    constructor(address _nft) ERC20("Reward", "RWD") {
        nft = IERC721(_nft);
    }


    // Event called when a new NFT gets staked
    event StakedNFT(uint256 indexed tokenId, address indexed owner);
    // Event called when an NFT gets unstaked
    event UnStakedNFT(uint256 indexed tokenId, address indexed owner, uint256 reward);
    // Event called when a reward is claimed from an staked NFT
    event ClaimedReward(uint256 indexed tokenId, address indexed owner, uint256 reward);


    /**
     * @dev Public function called to stake a new NFT (token needs to be first approved so this contract can transfer
     * the token)
     * @param tokenId is the Id of the NFT that should be staked.
     */
    function stake(uint256 tokenId) external {
        nft.safeTransferFrom(msg.sender, address(this), tokenId);
        ownerOfNFT[tokenId] = msg.sender;
        tokenStakedAtTimestamp[tokenId] = block.timestamp;
        isStaked[tokenId] = true;
        totalNFTsStaked.increment();
        _addTokenToOwnerEnumeration(msg.sender, tokenId);
        stakedBalanceOf[msg.sender] += 1;

        emit StakedNFT(tokenId, msg.sender);
    }

    /**
     * @dev Public view function to get the current rewards of an NFT
     * @param tokenId is the ID of the NFT for which the rewards are calculated
     */
    function calculateRewards(uint256 tokenId) public view returns (uint256) {
        require(isStaked[tokenId], "This Token id was never staked");
        uint timeElapsed = block.timestamp - tokenStakedAtTimestamp[tokenId];
        return timeElapsed * rewardsPerHour;
    }

    /**
     * @dev External function to unstake a staked NFT. Only the owner can unstake the NFT. During unstaking the smart
     * contract also mints and pays out the tokens that get rewarded to the owner of the NFT.
     * @param tokenId is the ID of the NFT which gets unstaked
     */
    function unstake(uint256 tokenId) external {
        require(ownerOfNFT[tokenId] == msg.sender, "You can't unstake because you are not the owner");
        uint256 reward = calculateRewards(tokenId);
        _mint(msg.sender, reward);
        nft.transferFrom(address(this), msg.sender, tokenId);
        delete ownerOfNFT[tokenId];
        delete tokenStakedAtTimestamp[tokenId];
        delete isStaked[tokenId];
        _removeTokenFromOwnerEnumeration(msg.sender, tokenId);
        stakedBalanceOf[msg.sender] -= 1;
        totalNFTsStaked.decrement();

        emit UnStakedNFT(tokenId, msg.sender, reward);
    }


    /**
     * @dev External function to claim the rewards of an staked NFT. The tokenStakedAtTimestamp will be reset to the current time.
     * @param tokenId is the ID of the NFT for which the rewards get claimed.
     */
    function claimRewards(uint256 tokenId) external {
        require(ownerOfNFT[tokenId] == msg.sender, "You can't claim rewards because you are not the owner");
        uint256 reward = calculateRewards(tokenId);
        _mint(msg.sender, reward);
        tokenStakedAtTimestamp[tokenId] = block.timestamp;
        emit ClaimedReward(tokenId, msg.sender, reward);
    }

    /**
     * @dev Public view function that returns the tokenID by index for an Owner
     * @param owner is the address of which we want to get the staked tokenId by index
     * @param index needs to be smaller then the current staked balance
     * @return tokenId of the staked NFT stored at that index
     */
    function stakedTokenOfOwnerByIndex(address owner, uint256 index) public view virtual returns (uint256) {
        require(index < stakedBalanceOf[owner], "index not valid");
        return _ownedTokens[owner][index];
    }



    // Additional internal functions needed for enumeration

    /**
    * @dev Private function to remove a token from this extension's ownership-tracking data structures. Note that
     * while the token is not assigned a new owner, the `_ownedTokensIndex` mapping is _not_ updated: this allows for
     * gas optimizations e.g. when performing a transfer operation (avoiding double writes).
     * This has O(1) time complexity, but alters the order of the _ownedTokens array.
     * @param from address representing the previous owner of the given token ID
     * @param tokenId uint256 ID of the token to be removed from the tokens list of the given address
     */
    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        // To prevent a gap in from's tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = stakedBalanceOf[from] - 1;
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastTokenIndex];

            _ownedTokens[from][tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
            _ownedTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index
        }

        // This also deletes the contents at the last position of the array
        delete _ownedTokensIndex[tokenId];
        delete _ownedTokens[from][lastTokenIndex];
    }

    /**
    * @dev Private function to add a token to this extension's ownership-tracking data structures.
     * @param to address representing the new owner of the given token ID
     * @param tokenId uint256 ID of the token to be added to the tokens list of the given address
     */
    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = stakedBalanceOf[to];
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

}