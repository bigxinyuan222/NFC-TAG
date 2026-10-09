export const NFC_CHECKIN_POINT_ID = 'point-001'

// Replace this test UID with the hexadecimal UID read from the authorized NFC card.
export const NFC_UID_ALLOWLIST = Object.freeze([
	'04A1B2C3D4E5F6'
])

export function normalizeNfcUid(value) {
	return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase()
}

export function isAuthorizedNfcUid(value) {
	const uid = normalizeNfcUid(value)
	return uid.length > 0 && NFC_UID_ALLOWLIST.includes(uid)
}
