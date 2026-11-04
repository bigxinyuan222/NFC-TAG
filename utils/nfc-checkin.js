let currentHandler = null
let unhandledIntentHandler = null
let intentListenerRegistered = false
let intentReadTimer = null
let currentAdapter = null
let currentActivity = null
let pendingIntent = null
let lastScanKey = ''
let lastScanTime = 0
let submissionLocked = false
let submissionLockTimer = null

const SCAN_DEBOUNCE_MS = 1000
const INTENT_RETRY_DELAY_MS = 100
const INTENT_MAX_RETRIES = 5
const NFC_CONSUMED_EXTRA = 'mycheckin.nfc.CONSUMED'
const SUBMISSION_LOCK_TIMEOUT_MS = 30000

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
	return { error: '非 APP-PLUS 平台' }
}

function clearNfcExtras(activity, intent, NfcAdapter) {
	// #ifdef APP-PLUS
	// 保留启动链接和其他参数，只消费已经成功读取的 NFC 数据。
	intent.removeExtra(NfcAdapter.EXTRA_TAG)
	intent.removeExtra(NfcAdapter.EXTRA_ID)
	intent.removeExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
	intent.putExtra(NFC_CONSUMED_EXTRA, true)
	activity.setIntent(intent)
	// #endif
}

function bytesToUid(bytes) {
	if (!bytes || !bytes.length) return null
	let uid = ''
	for (let index = 0; index < bytes.length; index++) {
		uid += (Number(bytes[index]) & 0xff).toString(16).padStart(2, '0')
	}
	return uid.toUpperCase()
}

function readCurrentNfcIntent() {
	// #ifdef APP-PLUS
	if (plus.os.name !== 'Android') return null
	try {
		const activity = plus.android.runtimeMainActivity()
		const NfcAdapter = plus.android.importClass('android.nfc.NfcAdapter')
		const intent = activity.getIntent()
		if (!intent) return null
		plus.android.importClass(intent)
		if (intent.getBooleanExtra(NFC_CONSUMED_EXTRA, false)) return { consumed: true }
		// 启动 Intent 可能被包装成 VIEW；以原生 NFC extra 为准，不只判断 action。
		let uid = bytesToUid(intent.getByteArrayExtra(NfcAdapter.EXTRA_ID))
		if (!uid) {
			const tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
			if (!tag) return null
			plus.android.importClass(tag)
			uid = bytesToUid(tag.getId())
		}
		if (!uid) return null
		clearNfcExtras(activity, intent, NfcAdapter)
		return { uid }
	} catch (error) {
		// 桥接尚未就绪或 Tag 暂时不可读时保留 Intent，交给后续重试。
		console.warn('[读取 NFC Intent 失败]', error)
	}
	// #endif
	return null
}

export function readTagFromCurrentIntent() {
	const tag = readCurrentNfcIntent()
	return tag && tag.uid ? tag.uid : null
}

function dispatchCurrentTag(background, attempt = 0) {
	intentReadTimer = null
	if (!currentHandler) return
	const tag = readCurrentNfcIntent()
	// 冷启动和 newintent 可能重复通知同一个 Intent，不能回退成“再次碰卡”。
	if (tag && tag.consumed) return
	const uid = tag && tag.uid
	if (!uid) {
		if (attempt < INTENT_MAX_RETRIES) {
			intentReadTimer = setTimeout(() => dispatchCurrentTag(background, attempt + 1), INTENT_RETRY_DELAY_MS)
		} else if (unhandledIntentHandler) {
			unhandledIntentHandler()
		}
		return
	}
	console.log('[NFC UID]', uid)
	const now = Date.now()
	if (uid === lastScanKey && now - lastScanTime < SCAN_DEBOUNCE_MS) return
	lastScanKey = uid
	lastScanTime = now
	currentHandler({ uid, scannedAt: now, background })
}

function handleNewIntent() {
	clearTimeout(intentReadTimer)
	// 冷启动/后台唤起时先记录来源，后续 onShow 开启前台调度也不改变本次来源。
	dispatchCurrentTag(!currentAdapter)
}

export function listenForNfcIntents(handler, onUnhandledIntent) {
	// #ifdef APP-PLUS
	currentHandler = handler
	unhandledIntentHandler = onUnhandledIntent
	if (!intentListenerRegistered) {
		plus.globalEvent.addEventListener('newintent', handleNewIntent)
		intentListenerRegistered = true
	}
	// 先注册再消费冷启动 Intent，读不到时短暂重试，不丢弃首次碰卡。
	handleNewIntent()
	// #endif
}

export function startNfcScan() {
	// #ifdef APP-PLUS
	const state = getAndroidNfc()
	if (state.error) return state
	stopNfcScan()
	const Intent = plus.android.importClass('android.content.Intent')
	const PendingIntent = plus.android.importClass('android.app.PendingIntent')
	const Build = plus.android.importClass('android.os.Build')
	const intent = new Intent(state.activity, state.activity.getClass())
	intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
	let flags = PendingIntent.FLAG_UPDATE_CURRENT
	if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE
	pendingIntent = PendingIntent.getActivity(state.activity, 0, intent, flags)
	state.adapter.enableForegroundDispatch(state.activity, pendingIntent, null, null)
	currentAdapter = state.adapter
	currentActivity = state.activity
	return { supported: true }
	// #endif
	return { error: '非 APP-PLUS 平台' }
}

export function stopNfcScan() {
	// #ifdef APP-PLUS
	if (currentAdapter && currentActivity) {
		try {
			currentAdapter.disableForegroundDispatch(currentActivity)
		} catch (error) {
			console.warn('[关闭 NFC 监听失败]', error)
		}
	}
	// #endif
	// newintent 监听贯穿应用生命周期，后台碰卡唤起时仍需读取启动 Intent。
	currentAdapter = null
	currentActivity = null
	pendingIntent = null
}
