import "regenerator-runtime"
import {
  makeEvent,
  Keyring,
  ConflictingApp
} from '@shapeshiftoss/hdwallet-core'
import { LedgerTransport, LedgerResponse } from '@shapeshiftoss/hdwallet-ledger'
import Transport from '@ledgerhq/hw-transport'
import TransportBLE from '@ledgerhq/hw-transport-web-ble'
import Eth from '@ledgerhq/hw-app-eth'
import Btc from '@ledgerhq/hw-app-btc'
import getAppAndVersion from '@ledgerhq/live-common/lib/hw/getAppAndVersion'
import getDeviceInfo from '@ledgerhq/live-common/lib/hw/getDeviceInfo'
import openApp from '@ledgerhq/live-common/lib/hw/openApp'

const RECORD_CONFORMANCE_MOCKS = false

function translateCoin(coin: string): (any) => void {
  return {
    'Btc': Btc,
    'Eth': Eth
  }[coin]
}

function translateMethod(method: string): (any) => void {
  return {
    'getAppAndVersion': getAppAndVersion,
    'getDeviceInfo': getDeviceInfo,
    'openApp': openApp
  }[method]
}

export async function openTransport(device: any): Promise<TransportBLE> {
  try {
    return await TransportBLE.open(device)
  } catch (err) {
    if (err.name === 'TransportInterfaceNotAvailable') {
      throw new ConflictingApp('Ledger')
    }

    throw err
  }
}

export async function getTransport(): Promise<TransportBLE> {
  try {
    return TransportBLE.create()
  } catch (err) {
    console.error('Error thrown on TransportBLE.create()')
    if (err.name === 'TransportInterfaceNotAvailable') {
      throw new ConflictingApp('Ledger')
    }

    throw err
  }
}

export class LedgerBLETransport extends LedgerTransport {
  device: any

  constructor(device: any, transport: Transport<any>, keyring: Keyring) {
    super(transport, keyring)
    this.device = device
  }

  public getDeviceID(): string {
    return (this.device as any).deviceID
  }

  public async call(coin: string, method: string, ...args: any[]): Promise<LedgerResponse> {
    let response

    try {
      this.emit(`ledger.${coin}.${method}.call`, makeEvent({
        message_type: method,
        from_wallet: false,
        message: {}
      }))

      if (coin) {
        response = await new (translateCoin(coin))(this.transport)[method](...args)
      } else {
        // @ts-ignore
        response = await (translateMethod(method))(this.transport, ...args)
      }
    } catch (e) {
      console.error(e)
      return {
        success: false,
        payload: { error: e.toString() },
        coin,
        method,
      }
    }

    let result = {
      success: true,
      payload: response,
      coin,
      method,
    }

    if (RECORD_CONFORMANCE_MOCKS) {
      // May need a slight amount of cleanup on escaping `'`s.
      console.log(`this.memoize('${coin}', '${method}',\n  JSON.parse('${JSON.stringify(args)}'),\n  JSON.parse('${JSON.stringify(result)}'))`)
    }

    return result
  }
}
