
import os
from dotenv import load_dotenv
from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    TopicCreateTransaction,
)

load_dotenv()

account_id = AccountId.from_string(os.environ["HEDERA_ACCOUNT_ID"])
private_key = PrivateKey.from_bytes_ecdsa(
    bytes.fromhex(
        os.environ["HEDERA_PRIVATE_KEY"].removeprefix("0x")
    )
)

client = Client(Network("testnet"))
client.set_operator(account_id, private_key)

try:
    transaction = (
        TopicCreateTransaction(
            memo="Amanah humanitarian aid audit log"
        )
        .freeze_with(client)
        .sign(private_key)
    )

    response = transaction.execute(client)
    receipt = response
    print("Topic ID:", receipt.topic_id)

    topic_id = str(receipt.topic_id)
    print("Created Topic ID:", topic_id)

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    with open(env_path, "a", encoding="utf-8") as f:
        f.write(f"\nHEDERA_TOPIC_ID={topic_id}\n")

    print("Topic ID appended to backend/.env")
finally:
    client.close()
