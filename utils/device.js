let cachedDeviceId = ''

// 获取设备标识：App 端优先用 plus.device.uuid（按设备+签名生成，每台手机各自不同）；
// 其他端（小程序/H5）拿不到系统级设备 ID，降级为本地持久化的随机 ID。
// 用途：随打卡请求上报后端，用于「同设备短时间内不能为不同账号打卡」的判定。
export function getDeviceId() {
	if (cachedDeviceId) return cachedDeviceId

	let deviceId = ''
	// #ifdef APP-PLUS
	try {
		deviceId = (plus.device && plus.device.uuid) || ''
	} catch (e) {
		deviceId = ''
	}
	// #endif

	if (!deviceId) {
		deviceId = uni.getStorageSync('deviceId') || ''
		if (!deviceId) {
			deviceId = 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
			uni.setStorageSync('deviceId', deviceId)
		}
	}

	cachedDeviceId = deviceId
	return deviceId
}
