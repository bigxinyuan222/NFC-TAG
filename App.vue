<script>
	import { clearSession, hasSession, requireNfcRescan, setPendingNfcTag } from './utils/session'
	import { acquireNfcSubmissionLock, readTagFromCurrentIntent, releaseNfcSubmissionLock, startNfcScan, stopNfcScan } from './utils/nfc-checkin'
	import { submitCheckin } from './api/checkin'
	import { getCheckinWindowStatus, hasCheckedInCurrentWindow } from './utils/checkin-record'
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
					this.showCheckinDenied('不在打卡时间范围内')
					return
				}
				if (hasCheckedInCurrentWindow(getSession())) {
					this.showCheckinDenied('该时间已打过卡')
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

			showCheckinDenied(message) {
				const deniedMessage = message || '不在打卡时间范围内'
				const pages = getCurrentPages()
				const current = pages[pages.length - 1]
				if (current && current.route === 'pages/checkin/index') {
					// 已在打卡页：直接通知当前页弹窗，避免跳页
					uni.$emit('checkin-window-denied', { message: deniedMessage })
					return
				}
				uni.setStorageSync('pendingCheckinDenied', { message: deniedMessage })
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
					if (hasCheckedInCurrentWindow(getSession())) {
						this.showLocalNotification('打卡失败', '该时间已打过卡')
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
/* 配色皮肤：全局 CSS 变量。默认（暖阳）声明在 page 上，各页面继承；
   页面根节点再挂 skin-mint / skin-dream / skin-sea 覆盖变量。 */
page {
	--sk-page-bg: #FDF6E9;
	--sk-bg-1: #FFF9EF;
	--sk-bg-2: #FDF3E4;
	--sk-bg-3: #FBEDD9;

	--sk-text: #3D3226;
	--sk-text-2: #4A3D2E;
	--sk-text-3: #7A6650;
	--sk-text-4: #8A7660;
	--sk-text-muted: #A08C77;
	--sk-text-faint: #B9A88F;

	--sk-accent: #F59A23;
	--sk-accent-deep: #D9871A;
	--sk-accent-light: #FFB84D;
	--sk-accent-ring: #FFCF8A;
	--sk-accent-tint: rgba(245, 154, 35, 0.12);
	--sk-accent-tint-weak: rgba(245, 154, 35, 0.07);
	--sk-accent-halo: rgba(245, 154, 35, 0.28);
	--sk-accent-halo-soft: rgba(255, 184, 77, 0.22);

	--sk-glow-1: rgba(255, 199, 130, 0.30);
	--sk-glow-2: rgba(255, 199, 130, 0.12);
	--sk-glow-3: rgba(255, 199, 130, 0.04);
	--sk-glow-4: rgba(255, 199, 130, 0);
	--sk-orb-1: rgba(255, 184, 77, 0.16);
	--sk-orb-2: rgba(255, 184, 77, 0.07);
	--sk-orb-3: rgba(255, 184, 77, 0);

	--sk-border: rgba(242, 231, 213, 0.92);
	--sk-line: #F2E7D5;
	--sk-field: #FFFAF2;
	--sk-chip: #F5EBDC;
	--sk-tab-muted: #C4B2A0;

	--sk-shadow-sm: rgba(212, 162, 94, 0.10);
	--sk-shadow: rgba(212, 162, 94, 0.12);
	--sk-shadow-lg: rgba(212, 162, 94, 0.18);
	--sk-shadow-xl: rgba(212, 162, 94, 0.22);

	background: var(--sk-page-bg);
}

.skin-mint {
	--sk-page-bg: #F3FAF2;
	--sk-bg-1: #F6FBF5;
	--sk-bg-2: #EAF6EC;
	--sk-bg-3: #DFF2E4;

	--sk-text: #2E4A38;
	--sk-text-2: #3A5A47;
	--sk-text-3: #56735F;
	--sk-text-4: #4E6B58;
	--sk-text-muted: #7E9C87;
	--sk-text-faint: #A3BCAA;

	--sk-accent: #5FA97A;
	--sk-accent-deep: #47875F;
	--sk-accent-light: #7FC295;
	--sk-accent-ring: #A8DCB9;
	--sk-accent-tint: rgba(95, 169, 122, 0.12);
	--sk-accent-tint-weak: rgba(95, 169, 122, 0.07);
	--sk-accent-halo: rgba(95, 169, 122, 0.28);
	--sk-accent-halo-soft: rgba(127, 194, 149, 0.22);

	--sk-glow-1: rgba(168, 220, 185, 0.30);
	--sk-glow-2: rgba(168, 220, 185, 0.12);
	--sk-glow-3: rgba(168, 220, 185, 0.04);
	--sk-glow-4: rgba(168, 220, 185, 0);
	--sk-orb-1: rgba(127, 194, 149, 0.16);
	--sk-orb-2: rgba(127, 194, 149, 0.07);
	--sk-orb-3: rgba(127, 194, 149, 0);

	--sk-border: rgba(205, 232, 213, 0.92);
	--sk-line: #CDE8D5;
	--sk-field: #F7FCF8;
	--sk-chip: #E3F2E7;
	--sk-tab-muted: #A8C2B0;

	--sk-shadow-sm: rgba(88, 140, 110, 0.10);
	--sk-shadow: rgba(88, 140, 110, 0.12);
	--sk-shadow-lg: rgba(88, 140, 110, 0.18);
	--sk-shadow-xl: rgba(88, 140, 110, 0.22);
}

.skin-dream {
	--sk-page-bg: #FAF6FE;
	--sk-bg-1: #FBF7FF;
	--sk-bg-2: #F6EFFB;
	--sk-bg-3: #EFE4F7;

	--sk-text: #3E3350;
	--sk-text-2: #4B3F5F;
	--sk-text-3: #6A5B80;
	--sk-text-4: #63547A;
	--sk-text-muted: #9A8DB0;
	--sk-text-faint: #BCAFCC;

	--sk-accent: #B07CD4;
	--sk-accent-deep: #9660BC;
	--sk-accent-light: #C79BE4;
	--sk-accent-ring: #DDBEF0;
	--sk-accent-tint: rgba(176, 124, 212, 0.12);
	--sk-accent-tint-weak: rgba(176, 124, 212, 0.07);
	--sk-accent-halo: rgba(176, 124, 212, 0.28);
	--sk-accent-halo-soft: rgba(199, 155, 228, 0.22);

	--sk-glow-1: rgba(221, 190, 240, 0.30);
	--sk-glow-2: rgba(221, 190, 240, 0.12);
	--sk-glow-3: rgba(221, 190, 240, 0.04);
	--sk-glow-4: rgba(221, 190, 240, 0);
	--sk-orb-1: rgba(199, 155, 228, 0.16);
	--sk-orb-2: rgba(199, 155, 228, 0.07);
	--sk-orb-3: rgba(199, 155, 228, 0);

	--sk-border: rgba(228, 214, 242, 0.92);
	--sk-line: #E4D6F2;
	--sk-field: #FBF7FF;
	--sk-chip: #EFE3F6;
	--sk-tab-muted: #BDB0C9;

	--sk-shadow-sm: rgba(150, 110, 190, 0.10);
	--sk-shadow: rgba(150, 110, 190, 0.12);
	--sk-shadow-lg: rgba(150, 110, 190, 0.18);
	--sk-shadow-xl: rgba(150, 110, 190, 0.22);
}

.skin-sea {
	--sk-page-bg: #F3F7FE;
	--sk-bg-1: #F4F8FF;
	--sk-bg-2: #EDF3FC;
	--sk-bg-3: #E2ECF9;

	--sk-text: #2C3A52;
	--sk-text-2: #37475F;
	--sk-text-3: #5A6B84;
	--sk-text-4: #52637C;
	--sk-text-muted: #8395AC;
	--sk-text-faint: #A9B9CB;

	--sk-accent: #6B8FD8;
	--sk-accent-deep: #5378C2;
	--sk-accent-light: #8FACEA;
	--sk-accent-ring: #B8CCF2;
	--sk-accent-tint: rgba(107, 143, 216, 0.12);
	--sk-accent-tint-weak: rgba(107, 143, 216, 0.07);
	--sk-accent-halo: rgba(107, 143, 216, 0.28);
	--sk-accent-halo-soft: rgba(143, 172, 234, 0.22);

	--sk-glow-1: rgba(184, 204, 242, 0.30);
	--sk-glow-2: rgba(184, 204, 242, 0.12);
	--sk-glow-3: rgba(184, 204, 242, 0.04);
	--sk-glow-4: rgba(184, 204, 242, 0);
	--sk-orb-1: rgba(143, 172, 234, 0.16);
	--sk-orb-2: rgba(143, 172, 234, 0.07);
	--sk-orb-3: rgba(143, 172, 234, 0);

	--sk-border: rgba(210, 224, 242, 0.92);
	--sk-line: #D2E0F2;
	--sk-field: #F7FBFF;
	--sk-chip: #E6EDF9;
	--sk-tab-muted: #B4C2D2;

	--sk-shadow-sm: rgba(110, 140, 195, 0.10);
	--sk-shadow: rgba(110, 140, 195, 0.12);
	--sk-shadow-lg: rgba(110, 140, 195, 0.18);
	--sk-shadow-xl: rgba(110, 140, 195, 0.22);
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
