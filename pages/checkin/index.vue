<template>
	<view class="wrap" :class="skinClass">
		<view class="screen-shell">
			<view class="hero-row">
				<view class="hero-text">
					<text class="title">你好，<text class="name">{{ userName }}</text></text>
					<view class="dept-row">
						<image class="dept-icon" src="/static/icons/building.svg" mode="aspectFit" />
						<text class="subtitle">{{ displayDepartment }}</text>
					</view>
				</view>
				<view class="avatar" :class="avatarFrameClass" @tap="previewAvatar">
					<image v-if="avatarUrl && !avatarLoadFailed" class="avatar-image" :src="avatarUrl" mode="aspectFill" @error="handleAvatarError" />
					<view v-else class="avatar-fallback">
						<image class="avatar-fallback-cat" :src="catAssets.playYarn.src" mode="aspectFill" />
					</view>
					<image v-if="avatarFrameOverlay" class="avatar-frame-overlay" :src="avatarFrameOverlay" mode="aspectFit" />
				</view>
			</view>

			<view class="center-panel">
				<text class="date-text">{{ dateText }}</text>
				<text class="time-text">{{ timeText }}</text>

				<view class="pulse-wrap">
					<view class="pulse-ring pulse-ring-outer"></view>
					<view class="pulse-ring pulse-ring-inner"></view>
					<image class="pulse-cat" src="/static/sprites/cat-hug.png" mode="aspectFit" />
					<view class="pulse-core">
						<view class="pulse-icon">
							<image class="pulse-wave" src="/static/icons/checkin-wave.svg" mode="aspectFit" />
						</view>
					<text class="pulse-label">{{ requiresNfcRescan ? '请再次碰卡验证' : '碰一下打卡' }}</text>
					</view>
				</view>

				<view class="tip-row">
					<text class="tip">{{ requiresNfcRescan ? '已打开应用，请再次靠近打卡卡片' : '请靠近打卡设备' }}</text>
				</view>
			</view>

			<view class="card">
				<view class="records-head">
					<text class="records-title">最近打卡</text>
					<text class="records-side" @tap="goRecords">查看全部</text>
				</view>

				<view class="record-row">
					<view class="record-left">
						<image v-if="latestSuccessTime" class="record-icon" src="/static/icons/check-circle.svg" mode="aspectFit" />
						<view v-else class="record-empty-visual">
							<image class="record-empty-cat" :src="catAssets.sleeping.src" mode="aspectFit" />
							<image class="record-empty-z" :src="catAssets.sleepZ.src" mode="aspectFit" />
						</view>
						<view class="record-text-col">
							<text class="record-label" :class="{ 'muted-text': !latestSuccessTime }">最近一次打卡时间</text>
							<text v-if="!latestSuccessTime" class="record-empty-hint">靠近设备进行打卡吧</text>
						</view>
					</view>
					<text v-if="latestSuccessTime" class="record-value">{{ latestSuccessTime }}</text>
				</view>
			</view>
		</view>

		<image class="bottom-decor" :src="decorSrc" mode="widthFix" />

		<app-tabbar current="checkin" :skin="skinClass" />

		<checkin-result
			:visible="resultVisible"
			:success="result.success"
			:message="result.message"
			:point-id="result.pointId"
			:time-text="result.timeText"
			@close="closeResult"
		/>
	</view>
</template>

<script>
	import AppTabbar from '@/components/app-tabbar/index.vue'
	import CheckinResult from '@/components/checkin-result/index.vue'
	import { clearSession, consumeNfcRescanRequired, consumePendingNfcTag, getSession, hasSession } from '@/utils/session'
	import { getCheckinWindowStatus, getTodayCheckinSummary, normalizeRemoteCheckinRecords, saveCheckinRecord } from '@/utils/checkin-record'
	import { getMyCheckins, submitCheckin as submitCheckinRequest } from '@/api/checkin'
	import { NFC_CHECKIN_POINT_ID } from '@/utils/nfc-config'
	import { releaseNfcSubmissionLock } from '@/utils/nfc-checkin'
	import { formatClockTime, formatDateText } from '@/utils/time'
	import { getAvatarFrame, getAvatarFrameId } from '@/utils/avatar-frame'
	import { getDisplayDepartment } from '@/utils/config'
	import { getSkinClass, getSkinDecorSrc } from '@/utils/skin'
	import catAssets from '@/utils/cat-assets'

	export default {
		components: {
			AppTabbar,
			CheckinResult
		},
		data() {
			return {
				catAssets,
				userName: '',
				department: '',
				avatarUrl: '',
				avatarLoadFailed: false,
				avatarFrameId: 'default',
				avatarFrameEntry: {},
				skinClass: 'skin-sunny',
				decorSrc: '/static/decor/decor-bottom.svg',
				timeText: '',
				dateText: '',
				summaryDateKey: '',
				summaryRequestVersion: 0,
				timer: null,
				pageVisible: false,
				requiresNfcRescan: false,
				resultVisible: false,
				isCheckingIn: false,
				latestSuccessTime: '',
				result: {
					success: true,
					message: '',
					pointId: '',
					timeText: ''
				}
			}
		},
		computed: {
			displayDepartment() {
				return getDisplayDepartment(this.department)
			},
			avatarFrameClass() {
				return this.avatarFrameEntry.className || ''
			},
			avatarFrameOverlay() {
				return this.avatarFrameEntry.overlay || ''
			}
		},
		onShow() {
			this.pageVisible = true
			this.skinClass = getSkinClass()
			this.decorSrc = getSkinDecorSrc()
			const { userName, department, avatarUrl } = getSession()
			this.userName = userName
			this.department = department
				this.avatarUrl = avatarUrl
				this.avatarLoadFailed = false
			this.avatarFrameId = getAvatarFrameId(getSession())
			this.avatarFrameEntry = getAvatarFrame(getSession())

			if (!hasSession()) {
				clearSession()
				this.goLogin()
				return
			}

			this.refreshClock()
			this.refreshTodaySummary()
			this.startClock()
			this.requiresNfcRescan = consumeNfcRescanRequired()
			const pendingNfcTag = consumePendingNfcTag()
			if (pendingNfcTag) this.handleNfcTag(pendingNfcTag)
			if (this.requiresNfcRescan) {
				setTimeout(() => {
					if (this.pageVisible && this.requiresNfcRescan) {
						uni.showToast({ title: '请再次碰卡验证', icon: 'none' })
					}
				}, 350)
			}
			uni.$on('checkin-window-denied', this.handleCheckinDenied)
			const pendingCheckinDenied = uni.getStorageSync('pendingCheckinDenied')
			if (pendingCheckinDenied) {
				uni.removeStorageSync('pendingCheckinDenied')
				this.handleCheckinDenied(pendingCheckinDenied)
			}
		},
		onHide() {
			this.pageVisible = false
			this.stopClock()
			uni.$off('checkin-window-denied', this.handleCheckinDenied)
		},
		onUnload() {
			this.pageVisible = false
			this.stopClock()
			uni.$off('checkin-window-denied', this.handleCheckinDenied)
		},
		methods: {
			goLogin() {
				uni.reLaunch({
					url: '/pages/login/index'
				})
			},
			goRecords() {
				uni.reLaunch({
					url: '/pages/records/index'
				})
			},
			handleCheckinDenied(options) {
				const message = options && options.message ? options.message : '不在打卡时间范围内'
				this.result = {
					success: false,
					message,
					pointId: '',
					timeText: ''
				}
				this.resultVisible = true
			},
			refreshClock() {
				const now = new Date()
				this.timeText = formatClockTime(now)
				this.dateText = formatDateText(now)
				if (this.summaryDateKey && this.summaryDateKey !== now.toDateString()) this.refreshTodaySummary()
			},
			refreshTodaySummary() {
				const session = {
					userName: this.userName,
					department: this.department
				}
				const summary = getTodayCheckinSummary(session)
				this.latestSuccessTime = summary.latestSuccessTime
				this.summaryDateKey = new Date().toDateString()
				this.syncRemoteLatestCheckin(session)
			},
			// 本地记录只覆盖前台碰卡；后台 NFC 打卡成功只存在后端。
			// 这里用记录页同款远端数据兜底：默认展示打卡列表最新一条（非今天的记录带日期前缀），避免首页空白
			async syncRemoteLatestCheckin(session) {
				const version = ++this.summaryRequestVersion
				try {
					const result = await getMyCheckins({ page: 1, pageSize: 5 })
					if (version !== this.summaryRequestVersion || !this.pageVisible) return
					const records = normalizeRemoteCheckinRecords(result.items, session)
					if (!records.length) return
					const now = new Date()
					const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
					const latest = records[0]
					const isToday = latest.dateKey === todayKey
					if (!this.latestSuccessTime) {
						this.latestSuccessTime = isToday ? latest.displayTime : latest.displayDate + ' ' + latest.displayTime
					} else if (isToday && latest.displayTime > this.latestSuccessTime) {
						this.latestSuccessTime = latest.displayTime
					}
				} catch (e) {
					// 网络或鉴权失败时保持本地展示，不干扰打卡主流程
					console.error('[首页最近一次打卡] 远端记录获取失败', e && (e.message || e.errMsg))
				}
			},
			startClock() {
				this.stopClock()
				this.timer = setInterval(() => {
					this.refreshClock()
				}, 1000)
			},
			stopClock() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			previewAvatar() {
				if (this.avatarLoadFailed || !this.avatarUrl) return
				uni.previewImage({
					urls: [this.avatarUrl]
				})
			},
			handleNfcTag(tag) {
				if (this.isCheckingIn) {
					uni.showToast({ title: '正在处理本次打卡', icon: 'none' })
					return
				}
				this.requiresNfcRescan = false
				const windowStatus = getCheckinWindowStatus()
				if (!windowStatus.allowed) {
					releaseNfcSubmissionLock()
					this.handleCheckinDenied()
					return
				}
				this.submitCheckin({
					message: '正在提交打卡',
					pointId: NFC_CHECKIN_POINT_ID,
					uid: tag && tag.uid ? tag.uid : '',
					time: Date.now(),
					source: 'nfc'
				}, true).finally(releaseNfcSubmissionLock)
			},
			async submitCheckin(payload, showResult) {
				this.isCheckingIn = true
				let success = false
				let message = payload.message || '打卡失败'
				const checkinTime = payload.time || Date.now()

				try {
					if (!payload.pointId) {
						throw new Error('未识别到有效的打卡点')
					}

					const result = await submitCheckinRequest({
						pointId: payload.pointId,
						uid: payload.uid || ''
					})
					const body = result.body || {}
					if (result.success) {
						success = true
						message = result.message
						console.log('[打卡成功]', {
							pointId: payload.pointId,
							uid: payload.uid,
							response: body
						})
					} else {
						message = result.message
						console.error('[打卡接口响应失败]', {
							statusCode: result.statusCode,
							response: body,
							pointId: payload.pointId
						})
					}
				} catch (e) {
					message = e && (e.message || e.errMsg) ? (e.message || e.errMsg) : '网络请求失败'
					console.error('[打卡失败原因]', message)
					console.error('[打卡失败]', {
						pointId: payload.pointId || '',
						error: e
					})
				}

				const date = new Date(checkinTime)
				const displayTime = formatClockTime(date)

				this.result = {
					success,
					message,
					pointId: '',
					timeText: displayTime
				}

				if (success) {
					const session = {
						userName: this.userName,
						department: this.department
					}
					saveCheckinRecord(session, {
						pointId: payload.pointId || '',
						time: checkinTime,
						message,
						source: payload.source || 'api'
					})
					this.refreshTodaySummary()
				}

				if (showResult) this.resultVisible = true
				this.isCheckingIn = false
				return { success }
			},
				closeResult() {
					this.resultVisible = false
				},
				handleAvatarError() {
					this.avatarLoadFailed = true
				}
		}
	}
</script>

<style>
	page {
		background: var(--sk-page-bg);
	}

	.wrap {
		position: relative;
		height: 100vh;
		height: 100dvh;
		padding: 24rpx 24rpx calc(124rpx + env(safe-area-inset-bottom));
		background: linear-gradient(180deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 60%, var(--sk-bg-3) 100%);
		box-sizing: border-box;
		overflow: hidden;
	}

	.bottom-decor {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(108rpx + env(safe-area-inset-bottom));
		width: 100%;
		z-index: 0;
		pointer-events: none;
	}

	.screen-shell {
		position: relative;
		z-index: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}

	.hero-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24rpx;
		margin-top: calc(var(--status-bar-height) + 36rpx);
	}

	.hero-text {
		padding-left: 22rpx;
		padding-top: 18rpx;
	}

	.title {
		display: block;
		color: var(--sk-text);
		font-size: 52rpx;
		font-weight: 700;
	}

	.name {
		color: var(--sk-accent);
	}

	.dept-row {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-top: 10rpx;
	}

	.dept-icon {
		width: 48rpx;
		height: 48rpx;
	}

	.subtitle {
		color: var(--sk-text-muted);
		font-size: 24rpx;
	}

	.avatar {
		position: relative;
		flex-shrink: 0;
		width: 88rpx;
		height: 88rpx;
		margin-top: 8rpx;
		border-radius: 50%;
		background: var(--sk-card-4);
		box-shadow: 0 10rpx 24rpx var(--sk-shadow-lg);
		overflow: hidden;
	}

	/* 三个大装饰框左右外扩超出 88rpx 头像所在空间，右侧留出余量防止被页面裁切、左侧避免压到文字 */
	.hero-row .avatar.avatar-frame--heartwing {
		margin-right: 10rpx;
	}

	.hero-row .avatar.avatar-frame--nightrose {
		margin-right: 24rpx;
	}

	.hero-row .avatar.avatar-frame--bluebow {
		margin-right: 4rpx;
	}

	.avatar-image,
	.avatar-fallback {
		width: 100%;
		height: 100%;
	}

	.avatar-image {
		border-radius: 50%;
	}

	.avatar-head {
		position: absolute;
		left: 50%;
		top: 16rpx;
		width: 28rpx;
		height: 28rpx;
		margin-left: -14rpx;
		border-radius: 50%;
		background: var(--sk-accent);
	}

	.avatar-body {
		position: absolute;
		left: 50%;
		bottom: 14rpx;
		width: 42rpx;
		height: 24rpx;
		margin-left: -21rpx;
		border-radius: 24rpx 24rpx 18rpx 18rpx;
		background: var(--sk-accent);
	}

	.center-panel {
		margin-top: 48rpx;
		text-align: center;
		flex-shrink: 0;
	}

	.date-text {
		display: block;
		color: var(--sk-text-muted);
		font-size: 26rpx;
	}

	.time-text {
		display: block;
		margin-top: 8rpx;
		color: var(--sk-text);
		font-size: 70rpx;
		font-weight: 700;
	}

	.pulse-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 500rpx;
		height: 500rpx;
		margin: 92rpx auto 0;
	}

	.pulse-ring {
		position: absolute;
		z-index: 0;
		border-radius: 50%;
	}

	.pulse-cat {
		position: absolute;
		z-index: 3;
		left: 100rpx;
		top: -166rpx;
		width: 300rpx;
		height: 321rpx;
		pointer-events: none;
		animation: cat-bob 3s ease-in-out infinite;
	}

	.pulse-ring-outer {
		width: 500rpx;
		height: 500rpx;
		background: var(--sk-accent-tint-weak);
		left: 50%;
		top: 50%;
		margin: -250rpx 0 0 -250rpx;
	}

	.pulse-ring-inner {
		width: 400rpx;
		height: 400rpx;
		background: var(--sk-accent-tint);
		left: 50%;
		top: 50%;
		margin: -200rpx 0 0 -200rpx;
	}

	@keyframes bob-breathe {
		0%, 100% {
			transform: translateY(0) scale(1);
		}

		50% {
			transform: translateY(-12rpx) scale(1.04);
		}
	}

	@keyframes cat-bob {
		0%, 100% {
			transform: translateY(0);
		}

		50% {
			transform: translateY(-12rpx);
		}
	}

	.pulse-core {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 308rpx;
		height: 308rpx;
		border-radius: 50%;
		background: linear-gradient(180deg, var(--sk-accent-light) 0%, var(--sk-accent) 100%);
		box-shadow: 0 18rpx 44rpx var(--sk-accent-halo);
		animation: bob-breathe 3s ease-in-out infinite;
	}

	.pulse-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 58rpx;
	}

	.pulse-wave {
		width: 92rpx;
		height: 92rpx;
	}

	.pulse-label {
		margin-top: 8rpx;
		color: #ffffff;
		font-size: 34rpx;
		font-weight: 600;
	}

	.tip-row {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 28rpx;
	}

	.tip {
		color: var(--sk-accent-deep);
		font-size: 30rpx;
		font-weight: 600;
	}

	.card {
		margin-top: 60rpx;
		padding: 22rpx 22rpx 28rpx;
		border-radius: 30rpx;
		background: var(--sk-card-2);
		border: 1rpx solid var(--sk-border);
		box-shadow: 0 18rpx 50rpx var(--sk-shadow);
		flex-shrink: 0;
	}

	.records-head,
	.record-row,
	.record-left {
		display: flex;
		align-items: center;
	}

	.records-head,
	.record-row {
		justify-content: space-between;
		gap: 24rpx;
	}

	.records-title {
		color: var(--sk-text);
		font-size: 30rpx;
		font-weight: 700;
	}

	.records-side {
		color: var(--sk-text-muted);
		font-size: 24rpx;
		line-height: 1.4;
	}

	.record-row {
		margin-top: 24rpx;
	}

	.record-left {
		gap: 18rpx;
		min-width: 0;
	}

	.record-text-col {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		min-width: 0;
	}

	.record-empty-hint {
		color: var(--sk-text-faint);
		font-size: 20rpx;
	}

	.record-empty-visual {
		position: relative;
		flex-shrink: 0;
		width: 72rpx;
		height: 72rpx;
	}

	.record-empty-cat {
		width: 72rpx;
		height: 72rpx;
	}

	.record-empty-z {
		position: absolute;
		top: -12rpx;
		right: -8rpx;
		width: 30rpx;
		height: 30rpx;
		pointer-events: none;
		animation: z-float 2.6s ease-out infinite;
	}

	.avatar-fallback-cat {
		width: 100%;
		height: 100%;
	}

	.record-icon {
		width: 52rpx;
		height: 52rpx;
		flex-shrink: 0;
	}

	.record-label {
		color: var(--sk-text-2);
		font-size: 25rpx;
	}

	.record-value {
		color: var(--sk-text);
		font-size: 32rpx;
		font-weight: 600;
		flex-shrink: 0;
	}

	.muted-text {
		color: var(--sk-text-faint);
	}
</style>
