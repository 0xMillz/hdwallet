import * as core from "@shapeshiftoss/hdwallet-core";
import * as NativeHDWallet from "./native";

const MNEMONIC = "all all all all all all all all all all all all";

const mswMock = require("mswMock")({
  get: {
    "https://dex.binance.org/api/v1/node-info": {
      node_info: {
        protocol_version: { p2p: 7, block: 10, app: 0 },
        id: "46ba46d5b6fcb61b7839881a75b081123297f7cf",
        listen_addr: "10.212.32.84:27146",
        network: "Binance-Chain-Tigris",
        version: "0.32.3",
        channels: "3640202122233038",
        moniker: "Ararat",
        other: { tx_index: "on", rpc_address: "tcp://0.0.0.0:27147" },
      },
      sync_info: {
        latest_block_hash: "307E98FD4A06AB02688C8539FF448431D521A3BB1C4D053DE3FBF1AD63276BA9",
        latest_app_hash: "A868C9E3186A4A8D562F73F3F53DB768F7F690478BF4D2C293A0F77F2E0C94DE",
        latest_block_height: 151030266,
        latest_block_time: "2021-03-18T20:42:11.972086064Z",
        catching_up: false,
      },
      validator_info: {
        address: "B7707D9F593C62E85BB9E1A2366D12A97CD5DFF2",
        pub_key: [
          113,
          242,
          215,
          184,
          236,
          28,
          139,
          153,
          166,
          83,
          66,
          155,
          1,
          24,
          205,
          32,
          31,
          121,
          79,
          64,
          157,
          15,
          234,
          77,
          101,
          177,
          182,
          98,
          242,
          176,
          0,
          99,
        ],
        voting_power: 1000000000000,
      },
    },
  },
}).startServer();
afterEach(() => expect(mswMock).not.toHaveBeenCalled());

const untouchable = require("untouchableMock");

describe("NativeBinanceWalletInfo", () => {
  const info = NativeHDWallet.info();

  it("should return some static metadata", async () => {
    await expect(untouchable.call(info, "binanceSupportsNetwork")).resolves.toBe(true);
    await expect(untouchable.call(info, "binanceSupportsSecureTransfer")).resolves.toBe(false);
    expect(untouchable.call(info, "binanceSupportsNativeShapeShift")).toBe(false);
  });

  it("should return the correct account paths", async () => {
    const paths = info.binanceGetAccountPaths({ accountIdx: 0 });
    expect(paths).toMatchObject([
      {
        addressNList: core.bip32ToAddressNList("m/44'/714'/0'/0/0"),
      },
    ]);
  });

  it("does not support getting the next account path", async () => {
    expect(untouchable.call(info, "binanceNextAccountPath", {})).toBe(undefined);
  });
});

describe("NativeBinanceWallet", () => {
  let wallet: NativeHDWallet.NativeHDWallet;

  beforeEach(async () => {
    wallet = NativeHDWallet.create({ deviceId: "native" });
    await wallet.loadDevice({ mnemonic: MNEMONIC });
    await expect(wallet.initialize()).resolves.toBe(true);
  });

  it("should generate a correct binance address", async () => {
    await expect(
      wallet.binanceGetAddress({ addressNList: core.bip32ToAddressNList("m/44'/714'/0'/0/0") })
    ).resolves.toBe("bnb1qzc0v2q7u6484czzal6ncuvqmg9fae8n2xe2c6");
  });

  it("should generate another correct binance address", async () => {
    await expect(
      wallet.binanceGetAddress({ addressNList: core.bip32ToAddressNList("m/44'/714'/1337'/123/4") })
    ).resolves.toBe("bnb14awl92k30hyhu36wjy6pg0trx3zlqrpfgsf3xk");
  });

  it("should sign a transaction correctly", async () => {
    const sig = await wallet.binanceSignTx({
      addressNList: core.bip32ToAddressNList("m/44'/714'/0'/0/0"),
      tx: {
        chain_id: "foo",
        account_number: "123",
        data: "bar",
        memo: "memo",
        msgs: [
          {
            inputs: [
              {
                address: "bnb1qzc0v2q7u6484czzal6ncuvqmg9fae8n2xe2c6",
                coins: [
                  {
                    amount: 1234,
                  },
                ],
              },
            ],
            outputs: [{ address: "bnb14awl92k30hyhu36wjy6pg0trx3zlqrpfgsf3xk" }],
          },
        ],
      },
      chain_id: "foo",
      account_number: "123",
      sequence: 456,
    });
    expect(sig.signatures).toMatchInlineSnapshot(`
      Object {
        "pub_key": "A/7/niWhEmyNrOL5jDyKiFyN1fMYjCxVPgyucVvj9UNT",
        "signature": "BnbtioXs2KyTQeJFpYQM6JmLgE4XOMLIDCCYw7z7wwpRMVwV0uVoeBoNh5zJrDcJzCQw8qmwzC+I5Cl/pTz+jg==",
      }
    `);
    expect(mswMock.handlers.get["https://dex.binance.org/api/v1/node-info"]).toHaveBeenCalled();
    mswMock.clear();
  });

  it("should not sign an invalid transaction", async () => {
    await expect(
      wallet.binanceSignTx({
        addressNList: core.bip32ToAddressNList("m/44'/714'/0'/0/0"),
        tx: {
          chain_id: "",
          account_number: "",
          data: "",
          memo: "",
          msgs: [{}],
        },
        chain_id: "",
        account_number: "foobar",
        sequence: Number.NaN,
      })
    ).rejects.toThrowError();
  });

  it("should not sign a transaction from a different account", async () => {
    await expect(
      wallet.binanceSignTx({
        addressNList: core.bip32ToAddressNList("m/44'/714'/0'/0/0"),
        tx: {
          chain_id: "foo",
          account_number: "123",
          data: "bar",
          memo: "memo",
          msgs: [
            {
              inputs: [
                {
                  address: "bnb14awl92k30hyhu36wjy6pg0trx3zlqrpfgsf3xk",
                  coins: [
                    {
                      amount: 1234,
                    },
                  ],
                },
              ],
              outputs: [{ address: "bnb1qzc0v2q7u6484czzal6ncuvqmg9fae8n2xe2c6" }],
            },
          ],
        },
        chain_id: "foo",
        account_number: "123",
        sequence: 456,
      })
    ).rejects.toThrowError("Invalid permissions to sign for address");
    expect(mswMock.handlers.get["https://dex.binance.org/api/v1/node-info"]).toHaveBeenCalled();
    mswMock.clear();
  });
});