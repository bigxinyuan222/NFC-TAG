const STORAGE_KEYS = {
	userName: 'userName',
	department: 'department',
	token: 'token',
	avatarUrl: 'avatarUrl',
	pendingCheckinResult: 'pendingCheckinResult'
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
	return !!userName && !!department
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
	LEGACY_KEYS.forEach((key) => {
		uni.removeStorageSync(key)
	})
}

export function getPendingCheckinResult() {
	const payload = uni.getStorageSync(STORAGE_KEYS.pendingCheckinResult)
	return payload && typeof payload === 'object' ? payload : null
}

export function setPendingCheckinResult(payload) {
	uni.setStorageSync(STORAGE_KEYS.pendingCheckinResult, payload)
}

export function clearPendingCheckinResult() {
	uni.removeStorageSync(STORAGE_KEYS.pendingCheckinResult)
}
