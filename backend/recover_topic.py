
import os
from dotenv import load_dotenv
from hiero_sdk_python import AccountId, Client, Network, PrivateKey
from hiero_sdk_python.query.transaction_get_receipt_query import (
    TransactionGetReceiptQuery,
)
from hiero_sdk_python.transaction.transaction_id import TransactionId

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
    tx_id = TransactionId.from_string(
        input("Successful transaction ID: ").strip()
    )
    receipt = (
        TransactionGetReceiptQuery()
        .set_transaction_id(tx_id)
        .execute(client)
    )
    print("Topic ID:", receipt.topic_id)
finally:
    client.close()
