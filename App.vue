<script>
	import { clearSession, hasSession, requireNfcRescan, setPendingNfcTag } from './utils/session'
	import { isAuthorizedNfcUid } from './utils/nfc-config'
	import { acquireNfcSubmissionLock, startNfcScan, stopNfcScan } from './utils/nfc-checkin'

let lastHandledUri = ''
let lastHandledUriTime = 0
const URI_DEBOUNCE_MS = 1000

	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			// 版本校验标记：重新打包后启动必弹，看到它即证明跑的是新代码
			setTimeout(() => {
				uni.showModal({
					title: '版本校验',
					content: '当前构建标记: NFC-BUILD-1010-C',
					showCancel: false
				})
			}, 1500)
			this.handle(plus.runtime.arguments)
			document.addEventListener('newintent', () => {
				uni.showToast({ title: 'App newintent: ' + plus.runtime.arguments, icon: 'none', duration: 4000 })
				this.handle(plus.runtime.arguments)
			})
			// #endif
		},
		onShow() {
			if (!hasSession()) return
			console.log('[App onShow] 启动 NFC 扫描')
			const state = startNfcScan((tag) => this.handleNfcTag(tag))
			if (state && state.error) console.warn('[NFC 不可用]', state.error)
		},
		onHide() {
			stopNfcScan()
		},

		methods: {
			handleNfcTag(tag) {
				if (!hasSession()) return
				if (!isAuthorizedNfcUid(tag && tag.uid)) {
					uni.showToast({ title: '非授权打卡卡片', icon: 'none' })
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
