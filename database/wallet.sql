CREATE TABLE wallets (

id INTEGER PRIMARY KEY,

user_id INTEGER,

balance DECIMAL DEFAULT 0,

frozen_balance DECIMAL DEFAULT 0,

currency VARCHAR(10)
DEFAULT 'YER',

created_at TIMESTAMP

);
CREATE TABLE wallets (

id INTEGER PRIMARY KEY,

user_id INTEGER,

balance DECIMAL DEFAULT 0,

frozen_balance DECIMAL DEFAULT 0,

currency VARCHAR(10)
DEFAULT 'YER',

created_at TIMESTAMP

);
CREATE TABLE transactions (

id INTEGER PRIMARY KEY,

wallet_id INTEGER,

type VARCHAR(30),

amount DECIMAL,

status VARCHAR(20),

created_at TIMESTAMP

);
deposit
withdraw
transfer
payment
recharge
