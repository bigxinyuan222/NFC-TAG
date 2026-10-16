const STORAGE_KEYS = {
	userName: 'userName',
	department: 'department',
	token: 'token',
	avatarUrl: 'avatarUrl',
	nfcRescanRequiredAt: 'nfcRescanRequiredAt',
	pendingNfcTag: 'pendingNfcTag'
}

const LEGACY_KEYS = ['userId']

export function getSession() {
	return {
		userName: uni.getStorageSync(STORAGE_KEYS.userName) || '',
		department: uni.getStorageSync(STORAGE_KEYS.department) || '',
		avatarUrl: uni.getStorageSync(STORAGE_KEYS.avatarUrl) || ''
	}
}

export function hasSession() {
	const { userName, department } = getSession()
	return !!userName && !!department && !!getToken()
}

export function getToken() {
	return uni.getStorageSync(STORAGE_KEYS.token) || ''
}

export function saveSession({ userName, department, token, avatarUrl }) {
	if (typeof userName === 'string') {
		uni.setStorageSync(STORAGE_KEYS.userName, userName)
	}
	if (typeof department === 'string') {
		uni.setStorageSync(STORAGE_KEYS.department, department)
	}
	if (typeof token === 'string' && token) {
		uni.setStorageSync(STORAGE_KEYS.token, token)
	}
	if (typeof avatarUrl === 'string') {
		uni.setStorageSync(STORAGE_KEYS.avatarUrl, avatarUrl)
	}
}

export function clearSession() {
	uni.removeStorageSync(STORAGE_KEYS.userName)
	uni.removeStorageSync(STORAGE_KEYS.department)
	uni.removeStorageSync(STORAGE_KEYS.token)
	uni.removeStorageSync(STORAGE_KEYS.avatarUrl)
	uni.removeStorageSync(STORAGE_KEYS.nfcRescanRequiredAt)
	uni.removeStorageSync(STORAGE_KEYS.pendingNfcTag)
	LEGACY_KEYS.forEach((key) => {
		uni.removeStorageSync(key)
	})
}

export function requireNfcRescan() {
	uni.setStorageSync(STORAGE_KEYS.nfcRescanRequiredAt, Date.now())
}

export function consumeNfcRescanRequired() {
	const requestedAt = Number(uni.getStorageSync(STORAGE_KEYS.nfcRescanRequiredAt))
	uni.removeStorageSync(STORAGE_KEYS.nfcRescanRequiredAt)
	return Number.isFinite(requestedAt) && Date.now() - requestedAt <= 60 * 1000
}

export function setPendingNfcTag(tag) {
	uni.setStorageSync(STORAGE_KEYS.pendingNfcTag, {
		uid: tag && tag.uid ? tag.uid : '',
		scannedAt: tag && tag.scannedAt ? tag.scannedAt : Date.now()
	})
}

export function consumePendingNfcTag() {
	const tag = uni.getStorageSync(STORAGE_KEYS.pendingNfcTag)
	uni.removeStorageSync(STORAGE_KEYS.pendingNfcTag)
	if (!tag || typeof tag !== 'object') return null
	if (!tag.uid || Date.now() - Number(tag.scannedAt) > 30 * 1000) return null
	return tag
}
