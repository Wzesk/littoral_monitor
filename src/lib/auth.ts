export const AUTH_COOKIE_NAME = 'littoral_monitor_auth'
export const DEFAULT_SITE_PASSWORD = 'littoral_intelligence'
export const DEFAULT_AUTH_TOKEN = '58cfc1a0e3ae7054f69bc988da20ffbd030c630dbff6ac2fd7afefa527076722'

export function getSitePassword() {
  return process.env.SITE_PASSWORD || DEFAULT_SITE_PASSWORD
}

export function getAuthToken() {
  return process.env.SITE_AUTH_TOKEN || DEFAULT_AUTH_TOKEN
}
