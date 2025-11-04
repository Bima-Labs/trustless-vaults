// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/**
 * Locking with Chainlink BTC/USD feed (Sepolia).
 *
 * - Users stake an ERC20 token (wbtc).
 * - Lock periods: 5 minutes, 10 minutes.
 * - At stake time we record Chainlink BTC/USD price (price has 8 decimals).
 * - After lock expires user can claim full stake.
 * - Admin can "buyBack" a stake:
 *     - send half of staked wbtc back to user
 *     - pay user USDC equal to the other half, priced using BTC/USD value recorded at stake time
 *
 * Requirements:
 *  - wbtc and usdc must be ERC20 tokens implementing decimals() (IERC20Metadata).
 *  - Contract must hold enough USDC to perform buybacks.
 */

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract WbtcStaking {
    using SafeERC20 for IERC20;

    address public admin;

    IERC20 public wbtc;
    IERC20 public usdc;
    uint8 public wbtcDecimals;
    uint8 public usdcDecimals;

    AggregatorV3Interface public btcUsdFeed;

    uint256 public nextStakeId;

    enum LockOption { FiveMin, TenMin }

    struct Stake {
        address user;
        uint256 amount;          // in wbtc token units
        uint256 startBlockTime;  // block.timestamp when staked
        uint256 lockDuration;    // seconds
        int256 btcUsdPrice;      // Chainlink price at stake time (8 decimals)
        bool active;
    }

    mapping(uint256 => Stake) public stakes;
    mapping(address => uint256[]) public stakesByUser;

    event Staked(uint256 indexed stakeId, address indexed user, uint256 amount, uint256 lockEnds, int256 priceAtStake);
    event Claimed(uint256 indexed stakeId, address indexed user);
    event BoughtBack(uint256 indexed stakeId, address indexed user, uint256 wbtcReturned, uint256 usdcPaid);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    constructor(
        address _wbtc,
        address _usdc,
        address _btcUsdFeed // e.g. Sepolia BTC/USD aggregator address
    ) {
        require(_wbtc != address(0) && _usdc != address(0) && _btcUsdFeed != address(0), "zero address");
        admin = msg.sender;
        wbtc = IERC20(_wbtc);
        usdc = IERC20(_usdc);

        // read decimals from token contracts
        wbtcDecimals = IERC20Metadata(_wbtc).decimals();
        usdcDecimals = IERC20Metadata(_usdc).decimals();

        btcUsdFeed = AggregatorV3Interface(_btcUsdFeed);

        nextStakeId = 1;
    }

    // --- user functions ---

    /**
     * Stake `amount` of wbtc for selected lock option.
     * User must approve this contract to spend `amount` wbtc before calling.
     */
    function stake(uint256 amount, LockOption option) external returns (uint256) {
        require(amount > 0, "amount zero");

        uint256 lockDuration = _lockDurationForOption(option);

        // pull tokens from user
        wbtc.safeTransferFrom(msg.sender, address(this), amount);

        // read current BTC/USD price from Chainlink
        (, int256 price, , , ) = btcUsdFeed.latestRoundData();
        require(price > 0, "invalid price");

        uint256 stakeId = nextStakeId++;
        stakes[stakeId] = Stake({
            user: msg.sender,
            amount: amount,
            startBlockTime: block.timestamp,
            lockDuration: lockDuration,
            btcUsdPrice: price,
            active: true
        });

        stakesByUser[msg.sender].push(stakeId);

        emit Staked(stakeId, msg.sender, amount, block.timestamp + lockDuration, price);
        return stakeId;
    }

    /**
     * User claims full staked wbtc after lock expired (and only if not bought back).
     */
    function claim(uint256 stakeId) external {
        Stake storage s = stakes[stakeId];
        require(s.active, "not active");
        require(s.user == msg.sender, "not owner");
        require(block.timestamp >= s.startBlockTime + s.lockDuration, "lock not expired");

        s.active = false;

        // transfer full amount back
        wbtc.safeTransfer(s.user, s.amount);

        emit Claimed(stakeId, s.user);
    }

    // --- admin functions ---

    /**
     * Admin buys back a stake: returns half wbtc to user and pays half value in USDC (price recorded at stake time).
     * Contract must have enough USDC balance to pay.
     */
    function buyBack(uint256 stakeId) external onlyAdmin {
        Stake storage s = stakes[stakeId];
        require(s.active, "not active");
        require(s.amount > 0, "zero amount");

        s.active = false;

        uint256 halfWmbtc = s.amount / 2;

        // transfer half of wbtc back to user
        if (halfWmbtc > 0) {
            wbtc.safeTransfer(s.user, halfWmbtc);
        }

        // compute USDC amount to pay for other half using stored price
        // price from Chainlink has 8 decimals (common), but we don't hardcode that -- we normalize by reading feed decimals if needed.
        // The AggregatorV3Interface doesn't expose decimals() via the interface, but Chainlink price feeds generally use 8 decimals.
        // We'll assume 8 decimals for price feed (documented in Chainlink). If you have a different feed, adjust accordingly.
        uint8 priceFeedDecimals = 8;

        // usdcAmount = halfWmbtc * price / (10**wbtcDecimals) * (10**usdcDecimals)
        // To do integer math: usdcAmount = halfWmbtc * uint256(price) * (10**usdcDecimals) / (10**(wbtcDecimals + priceFeedDecimals))
        uint256 numerator = halfWmbtc * uint256(uint256(int256(s.btcUsdPrice))) * (10 ** usdcDecimals);
        uint256 denom = (10 ** (wbtcDecimals + priceFeedDecimals));

        uint256 usdcToPay = numerator / denom;

        // sanity: if usdcToPay > 0 then transfer
        if (usdcToPay > 0) {
            require(IERC20(usdc).balanceOf(address(this)) >= usdcToPay, "contract USDC insufficient");
            usdc.safeTransfer(s.user, usdcToPay);
        }

        emit BoughtBack(stakeId, s.user, halfWmbtc, usdcToPay);
    }

    // Admin helper to withdraw tokens accidentally sent or to refill USDC (sensible admin-only withdrawal).
    function adminWithdrawERC20(address token, uint256 amount, address to) external onlyAdmin {
        require(to != address(0), "zero to");
        IERC20(token).safeTransfer(to, amount);
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }

    // --- view helpers ---

    function _lockDurationForOption(LockOption option) internal pure returns (uint256) {
        if (option == LockOption.FiveMin) return 5 * 60; // 5 minutes
        if (option == LockOption.TenMin) return 10 * 60; // 10 minutes
        revert("invalid");
    }

    function getUserStakeIds(address user) external view returns (uint256[] memory) {
        return stakesByUser[user];
    }

    function stakeInfo(uint256 stakeId) external view returns (
        address user,
        uint256 amount,
        uint256 startBlockTime,
        uint256 lockDuration,
        int256 btcUsdPrice,
        bool active,
        uint256 lockEnds
    ) {
        Stake storage s = stakes[stakeId];
        return (s.user, s.amount, s.startBlockTime, s.lockDuration, s.btcUsdPrice, s.active, s.startBlockTime + s.lockDuration);
    }
}
