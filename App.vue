<script>
	import { clearSession, hasSession, requireNfcRescan, setPendingNfcTag } from './utils/session'
	import { acquireNfcSubmissionLock, startNfcScan, stopNfcScan } from './utils/nfc-checkin'

let lastHandledUri = ''
let lastHandledUriTime = 0
const URI_DEBOUNCE_MS = 1000

	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			this.handle(plus.runtime.arguments)
			document.addEventListener('newintent', () => {
				this.handle(plus.runtime.arguments)
			})
			// #endif
		},
		onShow() {
			const state = startNfcScan((tag) => this.handleNfcTag(tag))
			if (state && state.error) console.warn('[NFC 不可用]', state.error)
		},
		onHide() {
			stopNfcScan()
		},

		methods: {
			handleNfcTag(tag) {
				if (!hasSession()) {
					uni.reLaunch({
						url: '/pages/login/index'
					})
					return
				}
				if (!acquireNfcSubmissionLock()) {
					uni.showToast({ title: '正在处理本次打卡', icon: 'none' })
					return
				}
				setPendingNfcTag(tag)
				uni.reLaunch({
					url: '/pages/checkin/index'
				})
			},
			handle(url) {
				if (!url || url.indexOf('mycheckin://') !== 0) return
				const now = Date.now()
				if (url === lastHandledUri && now - lastHandledUriTime < URI_DEBOUNCE_MS) return
				lastHandledUri = url
				lastHandledUriTime = now
				if (!hasSession()) {
					clearSession()
					uni.reLaunch({
						url: '/pages/login/index'
					})
					return
				}
				requireNfcRescan()

				uni.reLaunch({
					url: '/pages/checkin/index'
				})

			}
		}
	}
</script>

<style>
page {
	background: #f7f9fc;
}
</style>
