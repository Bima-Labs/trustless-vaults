-- Create the users table to store wallet addresses
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    btc_address VARCHAR(255) UNIQUE,
    evm_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the btc_transactions table for tBTC stakes
CREATE TABLE IF NOT EXISTS btc_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tx_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    lock_duration_days INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN DEFAULT FALSE,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP NULL,
    btc_price_at_tx DECIMAL(18, 2) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the wbtc_transactions table for wBTC stakes
CREATE TABLE IF NOT EXISTS wbtc_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tx_id VARCHAR(255) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    lock_duration_days INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN DEFAULT FALSE,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP NULL,
    btc_price_at_tx DECIMAL(18, 2) DEFAULT 0,
    stake_id INT, -- To store the stakeId from the smart contract
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_btc_transactions_user_id ON btc_transactions(user_id);
CREATE INDEX idx_btc_transactions_tx_id ON btc_transactions(tx_id);
CREATE INDEX idx_wbtc_transactions_user_id ON wbtc_transactions(user_id);
CREATE INDEX idx_wbtc_transactions_tx_id ON wbtc_transactions(tx_id);
CREATE INDEX idx_users_btc_address ON users(btc_address);
CREATE INDEX idx_users_evm_address ON users(evm_address);