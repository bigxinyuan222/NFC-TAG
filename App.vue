<script>
	import { clearSession, hasSession, requireNfcRescan, setPendingNfcTag } from './utils/session'
	import { acquireNfcSubmissionLock, readTagFromCurrentIntent, releaseNfcSubmissionLock, startNfcScan, stopNfcScan } from './utils/nfc-checkin'
	import { submitCheckin } from './api/checkin'
	import { getCheckinWindowStatus } from './utils/checkin-record'
	import { NFC_CHECKIN_POINT_ID } from './utils/nfc-config'
	import { getSession } from './utils/session'

	let lastHandledUri = ''
	let lastHandledUriTime = 0
	const URI_DEBOUNCE_MS = 1000

	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			// 冷启动时检查 Intent 是否携带 NFC TAG
			const uidFromLaunch = readTagFromCurrentIntent()
			if (uidFromLaunch) {
				this.handleBackgroundNfc(uidFromLaunch)
				return
			}

			this.handle(plus.runtime.arguments)
			document.addEventListener('newintent', () => {
				// 后台拉起时同样检查 NFC TAG
				const uid = readTagFromCurrentIntent()
				if (uid) {
					this.handleBackgroundNfc(uid)
				} else {
					this.handle(plus.runtime.arguments)
				}
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
				const windowStatus = getCheckinWindowStatus()
				if (!windowStatus.allowed) {
					this.showCheckinDenied()
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

			showCheckinDenied() {
				const pages = getCurrentPages()
				const current = pages[pages.length - 1]
				if (current && current.route === 'pages/checkin/index') {
					// 已在打卡页：直接通知当前页弹窗，避免跳页
					uni.$emit('checkin-window-denied')
					return
				}
				uni.setStorageSync('pendingCheckinDenied', true)
				uni.reLaunch({
					url: '/pages/checkin/index'
				})
			},

			async handleBackgroundNfc(uid) {
				if (!hasSession()) {
					uni.reLaunch({
						url: '/pages/login/index'
					})
					return
				}
				if (!acquireNfcSubmissionLock()) {
					console.log('[后台NFC] 已有打卡在处理中')
					return
				}

				try {
					const windowStatus = getCheckinWindowStatus()
					if (!windowStatus.allowed) {
						this.showLocalNotification('打卡失败', '不在打卡时间范围内')
						return
					}
					const result = await submitCheckin({
						pointId: NFC_CHECKIN_POINT_ID,
						uid: uid
					})
					const message = result.success ? (result.message || '打卡成功') : (result.message || '打卡失败')
					this.showLocalNotification(result.success ? '打卡成功' : '打卡失败', message)
					if (result.success) {
						this.saveLocalRecord(uid)
					}
				} catch (error) {
					const message = error && (error.message || error.errMsg) ? (error.message || error.errMsg) : '网络请求失败'
					this.showLocalNotification('打卡失败', message)
				} finally {
					releaseNfcSubmissionLock()
				}
			},

			saveLocalRecord(uid) {
				const session = getSession()
				const now = Date.now()
				const record = {
					id: String(now) + '-bg-' + uid.slice(-4),
					identityKey: session.userName + '::' + session.department,
					userName: session.userName,
					department: session.department,
					time: now,
					dateKey: new Date(now).toISOString().slice(0, 10),
					displayTime: new Date(now).toTimeString().slice(0, 5),
					slotId: '',
					type: '',
					status: 'success',
					pointId: NFC_CHECKIN_POINT_ID,
					message: '后台打卡',
					source: 'nfc-background'
				}
				try {
					const records = uni.getStorageSync('checkinRecords') || []
					records.unshift(record)
					uni.setStorageSync('checkinRecords', records)
				} catch (e) {
					console.error('[后台打卡] 保存本地记录失败', e)
				}
			},

			showLocalNotification(title, content) {
				// #ifdef APP-PLUS
				try {
					plus.push.createMessage(content, 'checkin-background', {
						title: title,
						when: new Date()
					})
				} catch (e) {
					console.error('[后台打卡] 通知失败', e)
				}
				// #endif
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
	background: #FDF6E9;
}

/* 头像框：用 box-shadow 叠加画环，避免 border 改变容器尺寸导致布局位移 */
.avatar-shell.avatar-frame--sunset,
.avatar.avatar-frame--sunset {
	box-shadow: 0 0 0 6rpx #FFB84D, 0 0 22rpx rgba(245, 154, 35, 0.5);
}

.avatar-shell.avatar-frame--mint,
.avatar.avatar-frame--mint {
	box-shadow: 0 0 0 6rpx #5FA97A, 0 0 18rpx rgba(95, 169, 122, 0.45);
}

.avatar-shell.avatar-frame--violet,
.avatar.avatar-frame--violet {
	box-shadow: 0 0 0 5rpx #B07CD4, 0 0 0 11rpx rgba(176, 124, 212, 0.28), 0 0 20rpx rgba(176, 124, 212, 0.4);
}

.avatar-shell.avatar-frame--gold,
.avatar.avatar-frame--gold {
	box-shadow: 0 0 0 4rpx #E6A23C, 0 0 0 10rpx rgba(230, 162, 60, 0.4), 0 0 18rpx rgba(230, 162, 60, 0.45);
}

/* 装饰型头像框（猫爪）：用 SVG 覆盖层叠加，容器需定位为参照 */
.avatar-frame-overlay {
	position: absolute;
	left: -16%;
	top: -16%;
	width: 132%;
	height: 132%;
	z-index: 3;
	pointer-events: none;
}

/* 猫爪形态：圆角方形 + 允许猫耳/爪印超出容器不被裁掉 */
.avatar-shell.avatar-shape--catpaw,
.avatar.avatar-shape--catpaw {
	position: relative;
	border-radius: 30%;
	overflow: visible;
}

/* 猫爪形态下头像内容也要跟着变圆角方形，否则方框里套圆形头像 */
.avatar-shape--catpaw .avatar-image,
.avatar-shape--catpaw .frame-preview-image,
.avatar-shape--catpaw .avatar-fallback {
	border-radius: 26%;
}

/* 猫爪自带金色 SVG 外框：去掉原有白色圆环（背景+内边距）与圆形阴影，避免叠成双环 */
.avatar-shell.avatar-frame--catpaw,
.avatar.avatar-frame--catpaw {
	box-shadow: none;
	background: transparent;
	padding: 0;
}
</style>
