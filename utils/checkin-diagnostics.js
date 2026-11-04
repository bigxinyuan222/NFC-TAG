// 实机验证：正式包的 JS 控制台日志可能不可见，保留同一份摘要到 Android 日志。
export function logCheckinDiagnostic(event, details) {
	console.log(event, details)
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.os.name === 'Android') {
			const Log = plus.android.importClass('android.util.Log')
			Log.i('NfcCheckin', event + ' ' + JSON.stringify(details))
		}
	} catch (error) {
		// 诊断失败不能影响打卡请求或服务器响应的处理。
		console.warn('[打卡诊断日志不可用]', error)
	}
	// #endif
}
