-- Create the database (if it doesn't exist)
CREATE DATABASE IF NOT EXISTS btc_vault;

-- Use the created database
USE btc_vault;

-- Drop the old transactions table if it exists
DROP TABLE IF EXISTS transactions;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  btc_address VARCHAR(255) UNIQUE,
  evm_address VARCHAR(255) UNIQUE
);

-- Create the btc_transactions table
CREATE TABLE IF NOT EXISTS btc_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tx_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(20, 8) NOT NULL,
  lock_duration_days INT NOT NULL,
  beneficiary_evm_address VARCHAR(255) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  block_height INT,
  block_time INT,
  btc_price_at_tx DECIMAL(20, 2) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create the wbtc_transactions table
CREATE TABLE IF NOT EXISTS wbtc_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tx_id VARCHAR(255) NOT NULL UNIQUE,
  amount DECIMAL(20, 8) NOT NULL,
  lock_duration_days INT NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  block_height INT,
  block_time INT,
  btc_price_at_tx DECIMAL(20, 2) NOT NULL,
  beneficiary_evm_address VARCHAR(255),
  stake_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE btc_transactions
ADD COLUMN claimed BOOLEAN NOT NULL DEFAULT FALSE AFTER confirmed,
ADD COLUMN claimed_at DATETIME NULL AFTER claimed;

ALTER TABLE wbtc_transactions
ADD COLUMN claimed BOOLEAN NOT NULL DEFAULT FALSE AFTER confirmed,
ADD COLUMN claimed_at DATETIME NULL AFTER claimed;

-- Add the early disbursement request flag to the btc_transactions table
ALTER TABLE btc_transactions
ADD COLUMN early_disbursement_requested BOOLEAN NOT NULL DEFAULT FALSE;

-- Add the early disbursement request flag to the wbtc_transactions table
ALTER TABLE wbtc_transactions
ADD COLUMN early_disbursement_requested BOOLEAN NOT NULL DEFAULT FALSE;

-- Add the stake_id to the wbtc_transactions table to link with the smart contract
ALTER TABLE wbtc_transactions ADD COLUMN stake_id INT;
