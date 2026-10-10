
import os
from dotenv import load_dotenv
from hiero_sdk_python import AccountId, Client, Network, PrivateKey

load_dotenv()

client = Client(Network("testnet"))
private_key = PrivateKey.from_bytes_ecdsa(
    bytes.fromhex(
        os.environ["HEDERA_PRIVATE_KEY"].removeprefix("0x")
    )
)
client.set_operator(
    AccountId.from_string(os.environ["HEDERA_ACCOUNT_ID"]),
    private_key,
)

try:
    from hiero_sdk_python.transaction.transaction_receipt import TransactionReceipt

    print("Receipt attributes:")
    print([name for name in dir(TransactionReceipt) if not name.startswith("_")])
finally:
    client.close()
