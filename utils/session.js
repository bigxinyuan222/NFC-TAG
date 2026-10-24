const STORAGE_KEYS = {
	userName: 'userName',
	department: 'department',
	token: 'token',
	avatarUrl: 'avatarUrl',
	dingtalkUserIdPrefix: 'dingtalkUserIdPrefix',
	nfcRescanRequiredAt: 'nfcRescanRequiredAt',
	pendingNfcTag: 'pendingNfcTag'
}

const LEGACY_KEYS = ['userId']

// 部门写死的用户 uid 列表：这些用户无论后端返回什么部门，统一显示为指定部门
const DEPARTMENT_OVERRIDE = {
	175: '27鹰飞',
	310: '27鹰飞'
}

// 从 JWT token 解析 uid
function getUidFromToken() {
	const token = getToken()
	if (!token) return null
	try {
		const payload = token.split('.')[1]
		if (!payload) return null
		const padded = payload + '='.repeat((4 - payload.length % 4) % 4)
		const json = decodeURIComponent(escape(atob(padded)))
		const data = JSON.parse(json)
		return data.uid
	} catch (e) {
		return null
	}
}

export function getSession() {
	const uid = getUidFromToken()
	// 特定用户部门写死
	const overrideDept = uid != null ? DEPARTMENT_OVERRIDE[uid] : null
	return {
		userName: uni.getStorageSync(STORAGE_KEYS.userName) || '',
		department: overrideDept || (uni.getStorageSync(STORAGE_KEYS.department) || ''),
		avatarUrl: uni.getStorageSync(STORAGE_KEYS.avatarUrl) || '',
		dingtalkUserIdPrefix: uni.getStorageSync(STORAGE_KEYS.dingtalkUserIdPrefix) || ''
	}
}

export function hasSession() {
	const { userName, department } = getSession()
	return !!userName && !!department && !!getToken()
}

export function getToken() {
	return uni.getStorageSync(STORAGE_KEYS.token) || ''
}

export function saveSession({ userName, department, token, avatarUrl, dingtalkUserIdPrefix }) {
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
	if (typeof dingtalkUserIdPrefix === 'string' && dingtalkUserIdPrefix) {
		uni.setStorageSync(STORAGE_KEYS.dingtalkUserIdPrefix, dingtalkUserIdPrefix)
	}
}

export function clearSession() {
	uni.removeStorageSync(STORAGE_KEYS.userName)
	uni.removeStorageSync(STORAGE_KEYS.department)
	uni.removeStorageSync(STORAGE_KEYS.token)
	uni.removeStorageSync(STORAGE_KEYS.avatarUrl)
	uni.removeStorageSync(STORAGE_KEYS.dingtalkUserIdPrefix)
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
