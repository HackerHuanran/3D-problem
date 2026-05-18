export function isAvatarImage(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export function avatarFallback(value, username = '') {
  const raw = String(value || '').trim()
  if (raw && !isAvatarImage(raw)) return raw

  const name = String(username || '').trim()
  return name ? name.slice(0, 1).toUpperCase() : '?'
}
