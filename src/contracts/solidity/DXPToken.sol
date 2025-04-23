// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DXPToken is ERC20 {
    constructor() ERC20("Dexponent Token", "DXP") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}