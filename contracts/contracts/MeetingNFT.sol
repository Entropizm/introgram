// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MeetingNFT is ERC721 {
    uint256 public nextTokenId;

    mapping(uint256 => address) public initiatorAddress;

    mapping(uint256 => bytes) private hiddenOtherParty;

    struct NFTMetadata {
        string location;
        string company;
        string position;
        string interests;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;

    event NFTMinted(uint256 indexed tokenId, address indexed initiator);

    constructor() ERC721("MeetingNFT", "MNFT") {
        nextTokenId = 1;
    }

    function mintNFT(bytes memory _encryptedOtherParty, string memory _location, string memory _company, string memory _position, string memory _interests) external {
        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(msg.sender, tokenId);

        initiatorAddress[tokenId] = msg.sender;
        hiddenOtherParty[tokenId] = _encryptedOtherParty;

        nftMetadata[tokenId] = NFTMetadata({
            location: _location,
            company: _company,
            position: _position,
            interests: _interests
        });

        emit NFTMinted(tokenId, msg.sender);
    }

    function getOtherPartyAddress(uint256 tokenId) external view returns (bytes memory) {
        require(ownerOf(tokenId) == msg.sender || initiatorAddress[tokenId] == msg.sender, "Not authorized");
        return hiddenOtherParty[tokenId];
    }

    function getNFTsByAddress(address _address) external view returns (uint256[] memory) {
        uint256 totalSupply = nextTokenId - 1;
        uint256 count = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (ownerOf(i) == _address || initiatorAddress[i] == _address) {
                count++;
            }
        }

        uint256[] memory tokens = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (ownerOf(i) == _address || initiatorAddress[i] == _address) {
                tokens[index] = i;
                index++;
            }
        }

        return tokens;
    }

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return nftMetadata[tokenId];
    }
}