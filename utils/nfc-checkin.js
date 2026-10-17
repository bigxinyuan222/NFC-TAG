let currentHandler = null
let currentAdapter = null
let currentActivity = null
let pendingIntent = null
let lastScanKey = ''
let lastScanTime = 0
let submissionLocked = false
let submissionLockTimer = null

const SCAN_DEBOUNCE_MS = 1000
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
}

function clearCurrentIntent(activity) {
	const Intent = plus.android.importClass('android.content.Intent')
	activity.setIntent(new Intent())
}

export function readTagFromCurrentIntent() {
	// #ifdef APP-PLUS
	const state = getAndroidNfc()
	if (state.error) return null
	const intent = state.activity.getIntent()
	if (!intent) return null
	plus.android.importClass(intent)
	const action = intent.getAction()
	const isNfcIntent = action === state.NfcAdapter.ACTION_TAG_DISCOVERED
		|| action === state.NfcAdapter.ACTION_TECH_DISCOVERED
		|| action === state.NfcAdapter.ACTION_NDEF_DISCOVERED
	if (!isNfcIntent) return null

	const tag = intent.getParcelableExtra(state.NfcAdapter.EXTRA_TAG)
	clearCurrentIntent(state.activity)
	if (!tag) return null
	plus.android.importClass(tag)
	const bytes = tag.getId()
	if (!bytes || !bytes.length) return null
	let uid = ''
	for (let index = 0; index < bytes.length; index++) {
		uid += (Number(bytes[index]) & 0xff).toString(16).padStart(2, '0')
	}
	return uid.toUpperCase()
}

function readCurrentTag() {
	return readTagFromCurrentIntent()
}

function dispatchCurrentTag() {
	const uid = readCurrentTag()
	if (!uid || !currentHandler) return
	console.log('[NFC UID]', uid)
	const now = Date.now()
	if (uid === lastScanKey && now - lastScanTime < SCAN_DEBOUNCE_MS) return
	lastScanKey = uid
	lastScanTime = now
	currentHandler({ uid, scannedAt: now })
}

function handleNewIntent() {
	setTimeout(dispatchCurrentTag, 100)
}

export function startNfcScan(handler) {
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
	currentHandler = handler
	currentAdapter = state.adapter
	currentActivity = state.activity
	plus.globalEvent.addEventListener('newintent', handleNewIntent)
	setTimeout(dispatchCurrentTag, 100)
	return { supported: true }
}

export function stopNfcScan() {
	// #ifdef APP-PLUS
	plus.globalEvent.removeEventListener('newintent', handleNewIntent)
	if (currentAdapter && currentActivity) {
		try {
			currentAdapter.disableForegroundDispatch(currentActivity)
		} catch (error) {
			console.warn('[关闭 NFC 监听失败]', error)
		}
	}
	// #endif
	currentHandler = null
	currentAdapter = null
	currentActivity = null
	pendingIntent = null
}
