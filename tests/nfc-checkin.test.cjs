const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const packageRecord = require('./fixtures/nfc-package-record.json')
const source = fs.readFileSync(path.join(root, 'utils/nfc-checkin.js'), 'utf8')
const EXTRA_ID = 'android.nfc.extra.ID'
const EXTRA_TAG = 'android.nfc.extra.TAG'
const EXTRA_NDEF_MESSAGES = 'android.nfc.extra.NDEF_MESSAGES'
const NFC_CONSUMED_EXTRA = 'mycheckin.nfc.CONSUMED'

function createRuntime({ sdk = 31, app = true, allowed = true, submitResult = { success: true }, submitError = null } = {}) {
	let now = 1700000000000
	let timerId = 0
	const timers = new Map()
	const listeners = new Set()
	const dispatches = []
	const tags = []
	const fallbacks = []
	const submissions = []
	const pendingTags = []
	const redirects = []
	const rescanRequests = []
	const toasts = []
	const modals = []
	const events = new Map()
	let currentPage = null
	const storage = new Map([['userName', '测试用户'], ['department', '测试部门'], ['token', 'test-token']])
	class Intent {
		static FLAG_ACTIVITY_SINGLE_TOP = 0x20000000
		constructor(action = 'android.intent.action.MAIN', extras = {}) {
			this.action = action
			this.extras = { ...extras }
			this.data = 'mycheckin://checkin'
		}
		getAction() { return this.action }
		getByteArrayExtra(key) { return this.extras[key] || null }
		getParcelableExtra(key) { return this.extras[key] || null }
		getBooleanExtra(key, fallback) { return key in this.extras ? this.extras[key] : fallback }
		putExtra(key, value) { this.extras[key] = value; return this }
		removeExtra(key) { delete this.extras[key]; return this }
		addFlags() { return this }
	}
	const activity = {
		intent: new Intent(),
		getIntent() { return this.intent },
		setIntent(intent) { this.intent = intent },
		getClass() { return 'MainActivity' }
	}
	const adapter = {
		isEnabled: () => true,
		enableForegroundDispatch: (...args) => dispatches.push(args),
		disableForegroundDispatch: () => dispatches.push('disabled')
	}
	const classes = {
		'android.nfc.NfcAdapter': { EXTRA_ID, EXTRA_TAG, EXTRA_NDEF_MESSAGES, getDefaultAdapter: () => adapter },
		'android.content.Intent': Intent,
		'android.os.Build': { VERSION: { SDK_INT: sdk } },
		'android.app.PendingIntent': {
			FLAG_UPDATE_CURRENT: 0x08000000,
			FLAG_MUTABLE: 0x02000000,
			getActivity: (target, requestCode, intent, flags) => ({ intent, flags })
		}
	}
	const plus = {
		os: { name: 'Android' },
		runtime: { arguments: 'mycheckin://checkin' },
		android: {
			runtimeMainActivity: () => activity,
			importClass: (value) => typeof value === 'string' ? classes[value] : value
		},
		globalEvent: {
			addEventListener: (event, handler) => {
				assert.equal(event, 'newintent')
				listeners.add(handler)
			}
		}
	}
	const context = vm.createContext({
		console: { log() {}, warn() {}, error() {} },
		Date: class extends Date { static now() { return now } },
		setTimeout: (callback, delay) => {
			const id = ++timerId
			timers.set(id, { at: now + delay, callback })
			return id
		},
		clearTimeout: (id) => timers.delete(id),
		...(app ? { plus } : {}),
		hasSession: () => true,
		getCheckinWindowStatus: () => ({ allowed }),
		submitCheckin: async (payload) => {
			submissions.push(payload)
			if (submitError) throw submitError
			return submitResult
		},
		NFC_CHECKIN_POINT_ID: 'point-001',
		getCurrentPages: () => currentPage ? [currentPage] : [],
		setPendingNfcTag: (tag) => pendingTags.push(tag),
		requireNfcRescan: () => rescanRequests.push(now),
		uni: {
			getStorageSync: (key) => storage.get(key),
			setStorageSync: (key, value) => storage.set(key, value),
			removeStorageSync: (key) => storage.delete(key),
			$on: (event, handler) => {
				if (!events.has(event)) events.set(event, new Set())
				events.get(event).add(handler)
			},
			$off: (event, handler) => events.get(event)?.delete(handler),
			$emit: (event) => { for (const handler of events.get(event) || []) handler() },
			reLaunch: (options) => redirects.push(options),
			showToast: (options) => toasts.push(options),
			showModal: (options) => modals.push(options)
		}
	})
	const sessionSource = fs.readFileSync(path.join(root, 'utils/session.js'), 'utf8')
	const session = vm.runInContext(sessionSource.replace(/^export /gm, '') + '\n({ setPendingCheckinResult, consumePendingCheckinResult, clearSession })', context)
	const storeTag = context.setPendingNfcTag
	context.setPendingNfcTag = (tag) => { pendingTags.push(tag); storeTag(tag) }
	const storeRescan = context.requireNfcRescan
	context.requireNfcRescan = () => { rescanRequests.push(now); storeRescan() }
	const compiled = (app ? source : source.replace(/^[\t ]*\/\/ #ifdef APP-PLUS\r?\n[\s\S]*?^[\t ]*\/\/ #endif\r?\n/gm, '')).replace(/^export /gm, '')
	const nfc = vm.runInContext(compiled + '\n({ readTagFromCurrentIntent, listenForNfcIntents, startNfcScan, stopNfcScan })', context)
	return {
		...nfc, ...session, activity, adapter, plus, Intent, listeners, tags, fallbacks, dispatches, storage,
		submissions, pendingTags, redirects, rescanRequests, toasts, modals,
		listen() { nfc.listenForNfcIntents((tag) => tags.push(tag), () => fallbacks.push(plus.runtime.arguments)) },
		emit() { for (const listener of listeners) listener() },
		tag(bytes, action = 'android.nfc.action.NDEF_DISCOVERED') {
			return new Intent(action, { [EXTRA_TAG]: { getId: () => bytes } })
		},
		advance(milliseconds) {
			const end = now + milliseconds
			while (true) {
				const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
				if (!next) break
				timers.delete(next[0])
				now = next[1].at
				next[1].callback()
			}
			now = end
		},
		loadPage() {
			Object.assign(context, {
				AppTabbar: {}, CheckinResult: {}, catAssets: {},
				getSkinClass: () => 'skin-sunny', getSkinDecorSrc: () => '',
				getAvatarFrameId: () => 'default', getAvatarFrame: () => ({}),
				submitCheckinRequest: context.submitCheckin,
				saveCheckinRecord() {}
			})
			const timeSource = fs.readFileSync(path.join(root, 'utils/time.js'), 'utf8')
			vm.runInContext(timeSource.replace(/^export /gm, ''), context)
			const pageSource = fs.readFileSync(path.join(root, 'pages/checkin/index.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
			vm.runInContext(pageSource.replace(/^\s*import .*$/gm, '').replace('export default', 'globalThis.pageOptions ='), context)
			const options = context.pageOptions
			const instance = { ...options, ...options.data() }
			instance.route = 'pages/checkin/index'
			currentPage = instance
			for (const [name, method] of Object.entries(options.methods)) instance[name] = method.bind(instance)
			for (const name of ['refreshClock', 'refreshTodaySummary', 'startClock', 'stopClock']) instance[name] = () => {}
			return instance
		},
		loadApp() {
			const appSource = fs.readFileSync(path.join(root, 'App.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
			vm.runInContext(appSource.replace(/^\s*import .*$/gm, '').replace('export default', 'globalThis.appOptions ='), context)
			const options = context.appOptions
			const instance = { ...options }
			for (const [name, method] of Object.entries(options.methods)) instance[name] = method.bind(instance)
			instance.saveLocalRecord = () => {}
			return instance
		}
	}
}

test('cold launch reads the first tag once and registers the listener before dispatch', () => {
	const runtime = createRuntime()
	runtime.activity.intent = runtime.tag([0x04, 0x00, -128, -1])
	runtime.listen()
	assert.equal(runtime.listeners.size, 1)
	assert.equal(runtime.tags.length, 1)
	assert.equal(runtime.tags[0].uid, '040080FF')
	assert.equal(runtime.tags[0].background, true)
	runtime.startNfcScan()
	runtime.advance(1000)
	assert.equal(runtime.tags.length, 1)
	assert.equal(runtime.fallbacks.length, 0)
})

test('cold launch retries the same tag when its UID is initially unavailable', () => {
	const runtime = createRuntime()
	let bytes = []
	const tag = { getId: () => bytes }
	runtime.activity.intent = new runtime.Intent('android.nfc.action.NDEF_DISCOVERED', { [EXTRA_TAG]: tag })
	runtime.listen()
	assert.equal(runtime.activity.intent.extras[EXTRA_TAG], tag)
	runtime.startNfcScan()
	bytes = [0x04, 0x01]
	runtime.advance(100)
	assert.equal(runtime.tags[0].uid, '0401')
	assert.equal(runtime.tags[0].background, true)
	assert.equal(runtime.fallbacks.length, 0)
})

test('cold launch retries when the native intent arrives after onShow', () => {
	const runtime = createRuntime()
	runtime.listen()
	runtime.startNfcScan()
	runtime.advance(200)
	runtime.activity.intent = runtime.tag([0x05, 0x12])
	runtime.advance(100)
	assert.equal(runtime.tags[0].uid, '0512')
	assert.equal(runtime.tags[0].background, true)
	assert.equal(runtime.fallbacks.length, 0)
})

test('EXTRA_ID is sufficient on a VIEW intent and avoids Tag deserialization', () => {
	const runtime = createRuntime()
	runtime.activity.intent = new runtime.Intent('android.intent.action.VIEW', { [EXTRA_ID]: [-1, 0, 1] })
	runtime.activity.intent.getParcelableExtra = () => { throw new Error('Tag unavailable') }
	assert.equal(runtime.readTagFromCurrentIntent(), 'FF0001')
})

test('successful reads consume only NFC extras and preserve launch data', () => {
	const runtime = createRuntime()
	const intent = runtime.tag([0x04, 0x00])
	intent.extras[EXTRA_NDEF_MESSAGES] = ['message']
	intent.extras.other = 'keep'
	runtime.activity.intent = intent
	assert.equal(runtime.readTagFromCurrentIntent(), '0400')
	assert.deepEqual(intent.extras, { other: 'keep', [NFC_CONSUMED_EXTRA]: true })
	assert.equal(intent.data, 'mycheckin://checkin')
	assert.equal(intent.action, 'android.nfc.action.NDEF_DISCOVERED')
	assert.equal(runtime.readTagFromCurrentIntent(), null)
})

test('a temporary native bridge error preserves the tag for the next attempt', () => {
	const runtime = createRuntime()
	let reads = 0
	runtime.activity.intent = runtime.tag([1])
	runtime.activity.intent.extras[EXTRA_TAG].getId = () => {
		if (++reads === 1) throw new Error('Bridge not ready')
		return [0x04, 0x02]
	}
	runtime.listen()
	runtime.advance(100)
	assert.equal(runtime.tags[0].uid, '0402')
	assert.equal(runtime.fallbacks.length, 0)
})

test('foreground dispatch sends a first tap to the foreground handler', () => {
	const runtime = createRuntime()
	runtime.listen()
	runtime.startNfcScan()
	runtime.activity.intent = runtime.tag([0x01, 0x02])
	runtime.emit()
	runtime.advance(1000)
	assert.equal(runtime.tags.length, 1)
	assert.equal(runtime.tags[0].background, false)
	assert.equal(runtime.fallbacks.length, 0)
})

test('the listener survives onHide and handles a background wake', () => {
	const runtime = createRuntime()
	runtime.listen()
	runtime.startNfcScan()
	runtime.stopNfcScan()
	runtime.activity.intent = runtime.tag([0x03, 0x04])
	runtime.emit()
	assert.equal(runtime.listeners.size, 1)
	assert.equal(runtime.tags[0].background, true)
})

test('duplicate events cannot submit twice; later taps and other cards remain readable', () => {
	const runtime = createRuntime()
	runtime.listen()
	runtime.startNfcScan()
	runtime.activity.intent = runtime.tag([0x01])
	runtime.emit()
	runtime.activity.intent = runtime.tag([0x01])
	runtime.emit()
	assert.equal(runtime.tags.length, 1)
	runtime.activity.intent = runtime.tag([0x02])
	runtime.emit()
	assert.equal(runtime.tags.length, 2)
	runtime.advance(1000)
	runtime.activity.intent = runtime.tag([0x01])
	runtime.emit()
	assert.equal(runtime.tags.length, 3)
})

test('repeated notifications for a consumed launch intent never request a rescan', () => {
	const runtime = createRuntime()
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	runtime.listen()
	runtime.startNfcScan()
	runtime.emit()
	runtime.advance(1500)
	runtime.emit()
	runtime.advance(500)
	assert.equal(runtime.tags.length, 1)
	assert.equal(runtime.fallbacks.length, 0)
})

test('a plain launch URL falls back once without fabricating a card UID', () => {
	const runtime = createRuntime()
	runtime.listen()
	runtime.advance(499)
	assert.equal(runtime.fallbacks.length, 0)
	runtime.advance(1)
	assert.equal(runtime.tags.length, 0)
	assert.deepEqual(runtime.fallbacks, ['mycheckin://checkin'])
	runtime.advance(1000)
	assert.equal(runtime.fallbacks.length, 1)
})

test('Android 12+ uses mutable PendingIntent while earlier Android keeps existing flags', () => {
	for (const sdk of [30, 31, 35]) {
		const runtime = createRuntime({ sdk })
		runtime.startNfcScan()
		const flags = runtime.dispatches[0][1].flags
		assert.equal(flags & 0x02000000, sdk >= 31 ? 0x02000000 : 0)
		assert.equal(flags & 0x08000000, 0x08000000)
	}
})

test('non-app builds do not access the native runtime', () => {
	const runtime = createRuntime({ app: false })
	runtime.listen()
	assert.equal(runtime.readTagFromCurrentIntent(), null)
	assert.equal(runtime.startNfcScan().error, '非 APP-PLUS 平台')
	runtime.stopNfcScan()
})

test('App cold launch submits the first UID and still handles the next foreground tap', async () => {
	const runtime = createRuntime()
	const app = runtime.loadApp()
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	app.onLaunch()
	assert.equal(runtime.modals.length, 0)
	app.onShow()
	assert.equal(runtime.modals.length, 0)
	await new Promise(setImmediate)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.submissions[0].pointId, 'point-001')
	assert.equal(runtime.submissions[0].uid, '0401')
	assert.equal(runtime.rescanRequests.length, 0)
	assert.equal(runtime.toasts.length, 0)
	const page = runtime.loadPage()
	page.onShow()
	assert.equal(page.resultVisible, true)
	assert.equal(page.result.success, true)
	assert.equal(runtime.submissions.length, 1, 'presenting the background result must not upload again')
	runtime.advance(1000)
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	runtime.emit()
	assert.equal(runtime.modals.length, 0)
	assert.equal(runtime.pendingTags.length, 1)
	assert.equal(runtime.pendingTags[0].uid, '0401')
	assert.equal(runtime.redirects.at(-1).url, '/pages/checkin/index')
})

test('an AAR-only tag cold-launches with the card UID rather than its package payload', async () => {
	const message = Buffer.from(packageRecord.ndefHex, 'hex')
	assert.equal(message.length, 36)
	assert.equal(message[0], 0xd4)
	const type = message.subarray(3, 3 + message[1]).toString('ascii')
	const payload = message.subarray(3 + message[1], 3 + message[1] + message[2]).toString('ascii')
	assert.equal(type, 'android.com:pkg')
	assert.equal(payload, packageRecord.packageName)
	const runtime = createRuntime()
	runtime.plus.runtime.arguments = ''
	const uidBytes = Array.from(Buffer.from(packageRecord.uidHex, 'hex'))
	const intent = runtime.tag(uidBytes)
	intent.data = 'vnd.android.nfc://ext/' + type
	intent.extras[EXTRA_ID] = uidBytes
	intent.extras[EXTRA_NDEF_MESSAGES] = [message]
	runtime.activity.intent = intent
	const app = runtime.loadApp()
	app.onLaunch()
	app.onShow()
	assert.equal(runtime.modals.length, 0)
	await new Promise(setImmediate)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.submissions[0].uid, packageRecord.uidHex)
	assert.equal(runtime.redirects.length, 1)
	assert.equal(runtime.redirects[0].url, '/pages/checkin/index')
	assert.equal(runtime.rescanRequests.length, 0)
})

test('App defers the rescan prompt while a first-launch tag becomes available', async () => {
	const runtime = createRuntime()
	const app = runtime.loadApp()
	app.onLaunch()
	app.onShow()
	runtime.advance(200)
	runtime.activity.intent = runtime.tag([0x04, 0x02])
	runtime.advance(100)
	assert.equal(runtime.modals.length, 0)
	await new Promise(setImmediate)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.submissions[0].uid, '0402')
	assert.equal(runtime.rescanRequests.length, 0)
	assert.equal(runtime.redirects.length, 1)
	assert.equal(runtime.redirects[0].url, '/pages/checkin/index')
})

test('App retains the rescan flow when a URL contains no native card data', () => {
	const runtime = createRuntime()
	const app = runtime.loadApp()
	app.onLaunch()
	app.onShow()
	runtime.advance(500)
	assert.equal(runtime.submissions.length, 0)
	assert.equal(runtime.modals.length, 0)
	assert.equal(runtime.rescanRequests.length, 1)
	assert.equal(runtime.redirects[0].url, '/pages/checkin/index')
})

test('App reports request failures without opening a UID popup', async () => {
	const runtime = createRuntime({ submitError: new Error('网络请求失败') })
	const app = runtime.loadApp()
	runtime.activity.intent = runtime.tag([0x04, -1, 0x00, 0x12])
	app.onLaunch()
	app.onShow()
	assert.equal(runtime.modals.length, 0)
	await new Promise(setImmediate)
	const page = runtime.loadPage()
	page.onShow()
	assert.equal(page.resultVisible, true)
	assert.equal(page.result.success, false)
	assert.equal(page.result.message, '网络请求失败')
	assert.equal(runtime.modals.length, 0)
})

test('App submits only once and shows no UID popup for duplicate launch notifications', async () => {
	const runtime = createRuntime()
	const app = runtime.loadApp()
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	app.onLaunch()
	app.onShow()
	runtime.emit()
	await new Promise(setImmediate)
	runtime.advance(1500)
	runtime.emit()
	app.onHide()
	app.onShow()
	assert.equal(runtime.modals.length, 0)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.rescanRequests.length, 0)
})

for (const scenario of [
	{ name: 'successful check-in', options: { submitResult: { success: true, message: '签到成功' } }, message: '签到成功', submissions: 1 },
	{ name: 'rejected check-in', options: { submitResult: { success: false, message: '卡片未登记' } }, message: '卡片未登记', submissions: 1 },
	{ name: 'network failure', options: { submitError: new Error('网络请求失败') }, message: '网络请求失败', submissions: 1 },
	{ name: 'disallowed check-in time', options: { allowed: false }, message: '不在打卡时间范围内', submissions: 0 }
]) {
	test('App presents the animated result without accessing Push for ' + scenario.name, async () => {
		const runtime = createRuntime(scenario.options)
		Object.defineProperty(runtime.plus, 'push', {
			get() { throw new Error('Push module is not packaged') }
		})
		const app = runtime.loadApp()
		await app.handleBackgroundNfc('0401')
		assert.equal(runtime.submissions.length, scenario.submissions)
		const page = runtime.loadPage()
		page.onShow()
		assert.equal(page.resultVisible, true)
		assert.equal(page.result.success, scenario.options.submitResult?.success === true)
		assert.equal(page.result.message, scenario.message)
		assert.match(page.result.timeText, /^\d{2}:\d{2}$/)
		assert.equal(runtime.toasts.length, 0)
		assert.equal(runtime.modals.length, 0)
		assert.equal(runtime.pendingTags.length, 0, 'completed background requests must not queue another scan')
		page.closeResult()
		page.onHide()
		page.onShow()
		assert.equal(page.resultVisible, false, 'returning to the page must not reopen consumed results')
		assert.equal(runtime.submissions.length, scenario.submissions)
	})
}

test('a response arriving after the page opens shows the result in place without another POST or page reload', async () => {
	let resolveRequest
	const response = new Promise((resolve) => { resolveRequest = resolve })
	const runtime = createRuntime({ submitResult: response })
	const app = runtime.loadApp()
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	app.onLaunch()
	app.onShow()
	const initialPage = runtime.loadPage()
	initialPage.onShow()
	assert.equal(initialPage.resultVisible, false, 'never celebrate an unfinished request')
	assert.equal(runtime.redirects.length, 0)
	resolveRequest({ success: true, message: '打卡成功' })
	await new Promise(setImmediate)
	assert.equal(initialPage.resultVisible, true)
	assert.equal(initialPage.result.success, true)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.redirects.length, 0)
})

test('a result arriving before an existing page subscribes survives until onShow', async () => {
	const runtime = createRuntime()
	const app = runtime.loadApp()
	const page = runtime.loadPage()
	await app.handleBackgroundNfc('0401')
	assert.equal(page.resultVisible, false)
	page.onShow()
	assert.equal(page.resultVisible, true)
	assert.equal(page.result.success, true)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.redirects.length, 0)
})

test('foreground NFC still submits once and opens the same successful result', async () => {
	const runtime = createRuntime({ submitResult: { success: true, message: '签到成功' } })
	const app = runtime.loadApp()
	app.onLaunch()
	app.onShow()
	runtime.activity.intent = runtime.tag([0x04, 0x01])
	runtime.emit()
	const page = runtime.loadPage()
	page.onShow()
	await new Promise(setImmediate)
	assert.equal(page.resultVisible, true)
	assert.equal(page.result.success, true)
	assert.equal(runtime.submissions.length, 1)
	assert.equal(runtime.submissions[0].uid, '0401')
	page.closeResult()
	page.onHide()
	page.onShow()
	assert.equal(page.resultVisible, false)
	assert.equal(runtime.submissions.length, 1)
})

test('queued results are consumed once, expire after a minute, and are cleared on logout', () => {
	const runtime = createRuntime()
	runtime.setPendingCheckinResult({ success: true, message: '打卡成功', time: 1700000000000 })
	assert.equal(runtime.consumePendingCheckinResult().time, 1700000000000)
	assert.equal(runtime.consumePendingCheckinResult(), null)
	runtime.setPendingCheckinResult({ success: true })
	runtime.advance(60001)
	assert.equal(runtime.consumePendingCheckinResult(), null)
	runtime.setPendingCheckinResult({ success: true })
	runtime.clearSession()
	assert.equal(runtime.consumePendingCheckinResult(), null)
})

test('result feedback celebrates success once, preserves rejection reasons, and tolerates unavailable haptics', () => {
	let haptics = 0
	const uni = { vibrateShort: () => { haptics++ } }
	const resultSource = fs.readFileSync(path.join(root, 'components/checkin-result/index.vue'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
	const options = vm.runInNewContext(resultSource.replace(/^\s*import .*$/gm, '').replace('export default', 'globalThis.resultOptions ='), { uni, catAssets: {} })
	const success = { success: true, message: '打卡成功' }
	options.watch.visible.handler.call(success, true)
	options.watch.visible.handler.call(success, false)
	assert.equal(haptics, 1)
	assert.match(options.computed.displayMessage.call(success), /本次打卡已记录/)
	const failure = { success: false, message: '卡片未登记' }
	options.watch.visible.handler.call(failure, true)
	assert.equal(haptics, 1, 'failed requests must not produce a success vibration')
	assert.equal(options.computed.displayMessage.call(failure), '卡片未登记')
	uni.vibrateShort = () => { throw new Error('unsupported device') }
	assert.doesNotThrow(() => options.watch.visible.handler.call(success, true))
})
