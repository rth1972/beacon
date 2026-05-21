import webPush from 'web-push'
import fs from 'fs'
import path from 'path'

const KEYS_PATH = path.join(process.cwd(), 'data', 'vapid.json')

function loadOrGenerateKeys(): { publicKey: string; privateKey: string } {
  if (fs.existsSync(KEYS_PATH)) {
    return JSON.parse(fs.readFileSync(KEYS_PATH, 'utf-8'))
  }
  const keys = webPush.generateVAPIDKeys()
  fs.writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2))
  console.log('[vapid] generated new VAPID keys')
  return keys
}

const keys = loadOrGenerateKeys()
const subject = process.env.NTFY_VAPID_SUBJECT || 'mailto:admin@beacon.local'

webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey)

export { keys, webPush as pushSender }
export const publicKey = keys.publicKey
