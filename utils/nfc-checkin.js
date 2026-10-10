// NFC 打卡读取逻辑
//
// 覆盖两种碰卡场景：
//   1) 碰 NFC 卡直接打开 APP：启动那一刻系统把 NFC intent 带进 activity.getIntent()
//   2) APP 已在前台再碰卡：通过 enableForegroundDispatch 前台派发
//
// 读取机制采用“newintent 事件 + 定时轮询 activity.getIntent()”双通道：
// HBuilderX 环境下 newintent 事件偶发不派发，轮询可兜底，确保每次碰卡都能读到 UID。
// 读取失败时弹出具体错误信息（同类错误 2 秒去重，避免轮询刷屏）。

let currentHandler = null
let currentAdapter = null
let currentActivity = null
let pendingIntent = null
let lastScanKey = ''
let lastScanTime = 0
let lastErrorKey = ''
let lastErrorTime = 0
let lastSeenAction = ''
let lastSeenActionTime = 0
let pollTimer = null
let submissionLocked = false
let submissionLockTimer = null

const SCAN_DEBOUNCE_MS = 2500
const SUBMISSION_LOCK_TIMEOUT_MS = 30000
const ERROR_DEBOUNCE_MS = 2000
const DIAG_DEBOUNCE_MS = 3000
const POLL_MS = 300

// 调试提示（APK 打包后屏幕可见）
function debugToast(msg) {
	uni.showToast({ title: msg, icon: 'none', duration: 4000 })
}

// 安全弹窗：先关掉正在显示的 toast，避免 showToast 遮挡/抑制 showModal
function showModalSafe(options) {
	try { uni.hideToast() } catch (e) {}
	uni.showModal(options)
}

// 弹出具体错误信息；同类错误 2 秒内只弹一次
function showErrorModal(msg) {
	const now = Date.now()
	if (msg === lastErrorKey && now - lastErrorTime < ERROR_DEBOUNCE_MS) return
	lastErrorKey = msg
	lastErrorTime = now
	showModalSafe({ title: 'NFC 读取失败', content: msg, showCancel: false })
}

export function acquireNfcSubmissionLock() {
	if (submissionLocked) return false
	submissionLocked = true
	clearTimeout(submissionLockTimer)
	submissionLockTimer = setTimeout(releaseNfcSubmissionLock, SUBMISSION_LOCK_TIMEOUT_MS)
	return true
}

export function releaseNfcSubmissionLock() {
	submissionLocked = false
	clearTimeout(submissionLockTimer)
	submissionLockTimer = null
}

function getAndroidNfc() {
	// #ifdef APP-PLUS
	if (plus.os.name !== 'Android') return { error: '当前平台不支持 NFC 读卡' }
	const activity = plus.android.runtimeMainActivity()
	const NfcAdapter = plus.android.importClass('android.nfc.NfcAdapter')
	const adapter = NfcAdapter.getDefaultAdapter(activity)
	if (!adapter) return { error: '当前设备不支持 NFC' }
	if (!adapter.isEnabled()) return { error: '请先在系统设置中开启 NFC' }
	return { activity, adapter, NfcAdapter }
	// #endif
	return { error: '当前平台不支持 NFC 读卡' }
}

// 把 activity 当前 intent 置空，避免同一 intent 被轮询重复触发
function clearCurrentIntent(activity) {
	const Intent = plus.android.importClass('android.content.Intent')
	activity.setIntent(new Intent())
}

// 读取当前卡片 UID。
// 返回：
//   null          —— 没有 intent，或 intent 不是 NFC intent（正常状态，静默）
//   { error }     —— 是 NFC intent，但读取 UID 失败（带具体原因）
//   { uid }       —— 读取成功（大写十六进制，如 5320C716430001）
function readCurrentTag() {
	const state = getAndroidNfc()
	if (state.error) return { error: state.error }

	const activity = state.activity
	const NfcAdapter = state.NfcAdapter
	const tagAction = NfcAdapter.ACTION_TAG_DISCOVERED
	const techAction = NfcAdapter.ACTION_TECH_DISCOVERED
	const ndefAction = NfcAdapter.ACTION_NDEF_DISCOVERED
	const runtimeArgs = plus.runtime.arguments

	const intent = activity.getIntent()
	if (!intent) {
		return { notNfc: true, action: '(无intent)', tagAction, techAction, ndefAction, runtimeArgs }
	}

	plus.android.importClass(intent)
	const action = intent.getAction()
	const isNfcIntent =
		action === tagAction || action === techAction || action === ndefAction
	if (!isNfcIntent) {
		return { notNfc: true, action: action || '(空action)', tagAction, techAction, ndefAction, runtimeArgs }
	}

	// 确认是 NFC intent，读取结束后统一清空 intent，防止轮询反复触发同一张卡
	let isNfcHandled = true
	try {
		const tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
		if (!tag) return { error: 'intent 中无 EXTRA_TAG（未携带卡片数据）' }

		plus.android.importClass(tag)
		let bytes
		try {
			bytes = tag.getId()
		} catch (e) {
			return { error: '调用 tag.getId() 失败: ' + (e && e.message ? e.message : String(e)) }
		}
		if (!bytes) return { error: 'tag.getId() 返回空' }

		// 获取字节数组长度（兼容 plus.android 桥接：length 可能不是 number）
		let len
		try {
			len = typeof bytes.length === 'number' ? bytes.length : 0
			if (!len) {
				const viaInvoke = plus.android.invoke(bytes, 'length')
				len = typeof viaInvoke === 'number' ? viaInvoke : 0
			}
		} catch (e) {
			return { error: '获取 UID 字节长度失败: ' + (e && e.message ? e.message : String(e)) }
		}
		if (!len) return { error: 'UID 字节长度为 0（卡片未返回序列号）' }

		// 逐字节转成两位十六进制
		let uid = ''
		for (let i = 0; i < len; i++) {
			const raw = bytes[i]
			if (raw == null) return { error: '第 ' + i + ' 字节读取失败（plus 桥接取不到数组元素）' }
			let n
			try {
				n = typeof raw === 'object'
					? (raw.intValue ? Number(raw.intValue()) : Number(raw))
					: Number(raw)
			} catch (e) {
				return { error: '第 ' + i + ' 字节转换失败: ' + (e && e.message ? e.message : String(e)) }
			}
			if (!Number.isFinite(n)) return { error: '第 ' + i + ' 字节值无效: ' + String(raw) }
			uid += (n & 0xff).toString(16).padStart(2, '0')
		}
		if (!uid) return { error: 'UID 结果为空' }
		return { uid: uid.toUpperCase() }
	} finally {
		if (isNfcHandled) clearCurrentIntent(activity)
	}
}

function dispatchCurrentTag() {
	try {
		const result = readCurrentTag()
		if (!result) return
		if (result.notNfc) {
			// 同一 action 在 3 秒窗口内只弹一次；窗口过后仍未读到会再次提示，避免首次被遮挡后永久静默
			const key = 'notNfc:' + result.action
			const nowTs = Date.now()
			if (key !== lastSeenAction || nowTs - lastSeenActionTime >= DIAG_DEBOUNCE_MS) {
				lastSeenAction = key
				lastSeenActionTime = nowTs
				showModalSafe({
					title: 'NFC 诊断：未读到卡片 intent',
					content:
						'当前 action: ' + result.action +
						'\n期望 TAG: ' + result.tagAction +
						'\n期望 TECH: ' + result.techAction +
						'\n期望 NDEF: ' + result.ndefAction +
						'\nruntime.arguments: ' + (result.runtimeArgs || '(空)'),
					showCancel: false
				})
			}
			return
		}
		if (result.error) {
			showErrorModal(result.error)
			return
		}
		const uid = result.uid
		const now = Date.now()
		if (uid === lastScanKey && now - lastScanTime < SCAN_DEBOUNCE_MS) return
		lastScanKey = uid
		lastScanTime = now
		showModalSafe({
			title: '读取到 NFC 卡片',
			content: 'UID: ' + uid,
			showCancel: false,
			success: () => {
				if (currentHandler) currentHandler({ uid, scannedAt: now })
			}
		})
	} catch (e) {
		showErrorModal('读取异常: ' + (e && e.message ? e.message : String(e)))
	}
}

// 轮询兜底：不依赖 newintent 事件，持续读取 activity 当前 intent
function startPolling() {
	stopPolling()
	const poll = function () {
		if (!currentActivity) return
		dispatchCurrentTag()
		pollTimer = setTimeout(poll, POLL_MS)
	}
	pollTimer = setTimeout(poll, POLL_MS)
}

function stopPolling() {
	if (pollTimer) {
		clearTimeout(pollTimer)
		pollTimer = null
	}
}

function handleNewIntent() {
	setTimeout(dispatchCurrentTag, 100)
}

export function startNfcScan(handler) {
	// #ifdef APP-PLUS
	const state = getAndroidNfc()
	if (state.error) return state
	// 启动提示用短 toast，避免长时间显示遮挡后续 UID/错误弹窗
	uni.showToast({ title: 'NFC扫描已启动 [1010-C]', icon: 'none', duration: 1200 })
	stopNfcScan()
	currentHandler = handler
	currentAdapter = state.adapter
	currentActivity = state.activity

	try {
		const Intent = plus.android.importClass('android.content.Intent')
		const PendingIntent = plus.android.importClass('android.app.PendingIntent')
		const Build = plus.android.importClass('android.os.Build')
		const intent = new Intent(state.activity, state.activity.getClass())
		intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
		let flags = PendingIntent.FLAG_UPDATE_CURRENT
		if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE
		pendingIntent = PendingIntent.getActivity(state.activity, 0, intent, flags)
		state.adapter.enableForegroundDispatch(state.activity, pendingIntent, null, null)
	} catch (e) {
		debugToast('前台派发启用失败: ' + (e && e.message ? e.message : String(e)))
	}

	// 双通道读取：newintent 事件（即时触发）+ 轮询（兜底，覆盖“碰卡打开 APP”场景）
	document.addEventListener('newintent', handleNewIntent, false)
	startPolling()
	// 启动后立即读一次，尽量早地拿到碰卡启动时带入的 NFC intent
	setTimeout(dispatchCurrentTag, 100)

	// 无条件探针（不依赖轮询/setTimeout）：确认 startNfcScan 走到末尾，并直接读当前 intent
	try {
		const probeIntent = state.activity.getIntent()
		let probeAction = '(无intent)'
		if (probeIntent) {
			plus.android.importClass(probeIntent)
			probeAction = probeIntent.getAction() || '(空action)'
		}
		showModalSafe({
			title: '探针：扫描函数已执行完',
			content:
				'当前 action: ' + probeAction +
				'\nTAG常量: ' + state.NfcAdapter.ACTION_TAG_DISCOVERED +
				'\nNDEF常量: ' + state.NfcAdapter.ACTION_NDEF_DISCOVERED +
				'\narguments: ' + (plus.runtime.arguments || '(空)'),
			showCancel: false
		})
	} catch (probeE) {
		showModalSafe({ title: '探针自身异常', content: String(probeE), showCancel: false })
	}
	return { supported: true }
	// #endif
	return { error: '当前平台不支持 NFC 读卡' }
}

export function stopNfcScan() {
	// #ifdef APP-PLUS
	document.removeEventListener('newintent', handleNewIntent, false)
	if (currentAdapter && currentActivity) {
		try {
			currentAdapter.disableForegroundDispatch(currentActivity)
		} catch (error) {
			console.warn('[关闭 NFC 监听失败]', error)
		}
	}
	// #endif
	stopPolling()
	currentHandler = null
	currentAdapter = null
	currentActivity = null
	pendingIntent = null
}
