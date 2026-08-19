<script>
	import { clearSession, hasSession, setPendingCheckinResult } from './utils/session'

	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			this.handle(plus.runtime.arguments)
			document.addEventListener('newintent', () => {
				this.handle(plus.runtime.arguments)
			})
			// #endif
		},

		methods: {
			handle(url) {
				if (!url || url.indexOf('mycheckin://') !== 0) return
				const pointId = url.split('/').pop()
				const payload = {
					pointId,
					time: Date.now(),
					message: pointId ? '识别到打卡点，已准备提交本次打卡' : '已接收到打卡请求',
					success: true
				}

				setPendingCheckinResult(payload)

				if (!hasSession()) {
					clearSession()
					uni.reLaunch({
						url: '/pages/login/index'
					})
					return
				}

				uni.reLaunch({
					url: '/pages/checkin/index'
				})

				uni.showToast({
					title: pointId ? '已识别打卡点' : '收到打卡请求',
					icon: 'none',
					duration: 2000
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
