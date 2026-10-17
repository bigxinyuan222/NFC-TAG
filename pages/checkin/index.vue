<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="screen-shell">
			<view class="hero-row">
				<view class="hero-text">
					<text class="title">你好，<text class="name">{{ userName }}</text></text>
					<view class="dept-row">
						<image class="dept-icon" src="/static/icons/building.svg" mode="aspectFit" />
						<text class="subtitle">{{ department }}</text>
					</view>
				</view>
				<view class="avatar" @longpress="logout">
					<image v-if="avatarUrl && !avatarLoadFailed" class="avatar-image" :src="avatarUrl" mode="aspectFill" @error="handleAvatarError" />
					<view v-else class="avatar-fallback">
						<view class="avatar-head"></view>
						<view class="avatar-body"></view>
					</view>
				</view>
			</view>

			<view class="center-panel">
				<text class="date-text">{{ dateText }}</text>
				<text class="time-text">{{ timeText }}</text>

				<view class="pulse-wrap">
					<view class="pulse-ring pulse-ring-outer"></view>
					<view class="pulse-ring pulse-ring-inner"></view>
					<view class="pulse-core">
						<view class="pulse-icon">
							<image class="pulse-wave" src="/static/icons/checkin-wave.svg" mode="aspectFit" />
						</view>
					<text class="pulse-label">{{ requiresNfcRescan ? '请再次碰卡验证' : '碰一下打卡' }}</text>
					</view>
				</view>

				<view class="tip-row">
					<text class="tip-dot"></text>
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
						<image class="record-icon" :src="latestSuccessTime ? '/static/icons/check-circle.svg' : '/static/icons/clock.svg'" mode="aspectFit" />
						<text class="record-label" :class="{ 'muted-text': !latestSuccessTime }">最近一次打卡时间</text>
					</view>
					<text v-if="latestSuccessTime" class="record-value">{{ latestSuccessTime }}</text>
				</view>
			</view>
		</view>

		<app-tabbar current="checkin" :theme="currentTheme" />

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
	import { getCheckinWindowStatus, getTodayCheckinSummary, saveCheckinRecord } from '@/utils/checkin-record'
	import { submitCheckin as submitCheckinRequest } from '@/api/checkin'
	import { NFC_CHECKIN_POINT_ID } from '@/utils/nfc-config'
	import { releaseNfcSubmissionLock } from '@/utils/nfc-checkin'
	import { getTheme } from '@/utils/theme'
	import { formatClockTime, formatDateText } from '@/utils/time'

	export default {
		components: {
			AppTabbar,
			CheckinResult
		},
		data() {
			return {
				userName: '',
				department: '',
				avatarUrl: '',
				avatarLoadFailed: false,
				currentTheme: 'light',
				timeText: '',
				dateText: '',
				summaryDateKey: '',
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
		onShow() {
			this.pageVisible = true
			const { userName, department, avatarUrl } = getSession()
			this.userName = userName
			this.department = department
				this.avatarUrl = avatarUrl
				this.avatarLoadFailed = false
			this.currentTheme = getTheme()

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
			if (uni.getStorageSync('pendingCheckinDenied')) {
				uni.removeStorageSync('pendingCheckinDenied')
				this.handleCheckinDenied()
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
			handleCheckinDenied() {
				this.result = {
					success: false,
					message: '不在打卡时间范围内',
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
				const summary = getTodayCheckinSummary({
					userName: this.userName,
					department: this.department
				})
				this.latestSuccessTime = summary.latestSuccessTime
				this.summaryDateKey = new Date().toDateString()
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
			logout() {
				clearSession()
				this.goLogin()
			},
			handleNfcTag(tag) {
				if (this.isCheckingIn) {
					releaseNfcSubmissionLock()
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
					message = e && (e.message || e.errMsg) ? (e.message || e.errMsg) : '网络失败'
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
		background: #FDF6E9;
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		padding: 24rpx 24rpx 112rpx;
		background: linear-gradient(180deg, #FFF9EF 0%, #FDF3E4 60%, #FBEDD9 100%);
		box-sizing: border-box;
		overflow: hidden;
	}

	.screen-shell {
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
		margin-top: 100rpx;
	}

	.hero-text {
		padding-left: 22rpx;
		padding-top: 18rpx;
	}

	.title {
		display: block;
		color: #3D3226;
		font-size: 52rpx;
		font-weight: 700;
	}

	.name {
		color: #F59A23;
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
		color: #A08C77;
		font-size: 24rpx;
	}

	.avatar {
		position: relative;
		flex-shrink: 0;
		width: 88rpx;
		height: 88rpx;
		margin-top: 8rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.78);
		box-shadow: 0 10rpx 24rpx rgba(212, 162, 94, 0.16);
		overflow: hidden;
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
		background: #F59A23;
	}

	.avatar-body {
		position: absolute;
		left: 50%;
		bottom: 14rpx;
		width: 42rpx;
		height: 24rpx;
		margin-left: -21rpx;
		border-radius: 24rpx 24rpx 18rpx 18rpx;
		background: #F59A23;
	}

	.theme-dark {
		background: linear-gradient(180deg, #211A14 0%, #2A211A 55%, #211A14 100%);
	}

	.theme-dark .title,
	.theme-dark .time-text,
	.theme-dark .records-title,
	.theme-dark .record-label,
	.theme-dark .record-value {
		color: #F5E9D9;
	}

	.theme-dark .subtitle,
	.theme-dark .date-text,
	.theme-dark .tip,
	.theme-dark .records-side,
	.theme-dark .muted-text {
		color: #B09A83;
	}

	.theme-dark .card,
	.theme-dark .avatar {
		background: rgba(48, 39, 31, 0.96);
		box-shadow: none;
	}

	.center-panel {
		margin-top: 66rpx;
		text-align: center;
		flex-shrink: 0;
	}

	.date-text {
		display: block;
		color: #A08C77;
		font-size: 26rpx;
	}

	.time-text {
		display: block;
		margin-top: 8rpx;
		color: #3D3226;
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
		margin: 30rpx auto 0;
	}

	.pulse-ring {
		position: absolute;
		border-radius: 50%;
	}

	.pulse-ring-outer {
		width: 500rpx;
		height: 500rpx;
		background: rgba(245, 154, 35, 0.07);
	}

	.pulse-ring-inner {
		width: 400rpx;
		height: 400rpx;
		background: rgba(245, 154, 35, 0.12);
	}

	.pulse-core {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 308rpx;
		height: 308rpx;
		border-radius: 50%;
		background: linear-gradient(180deg, #FFB84D 0%, #F59A23 100%);
		box-shadow: 0 18rpx 44rpx rgba(245, 154, 35, 0.28);
	}

	.pulse-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 58rpx;
	}

	.pulse-wave {
		width: 132rpx;
		height: 132rpx;
	}

	.pulse-label {
		margin-top: 16rpx;
		color: #ffffff;
		font-size: 34rpx;
		font-weight: 600;
	}

	.tip-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
		margin-top: 28rpx;
	}

	.tip-dot {
		width: 18rpx;
		height: 18rpx;
		border: 4rpx solid #FFCF8A;
		border-radius: 50%;
		box-shadow: 0 0 0 8rpx rgba(255, 184, 77, 0.22);
	}

	.tip {
		color: #D9871A;
		font-size: 30rpx;
		font-weight: 600;
	}

	.card {
		margin-top: 100rpx;
		padding: 22rpx 22rpx 28rpx;
		border-radius: 30rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 18rpx 50rpx rgba(212, 162, 94, 0.12);
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
		color: #3D3226;
		font-size: 30rpx;
		font-weight: 700;
	}

	.records-side {
		color: #A08C77;
		font-size: 24rpx;
	}

	.record-row {
		margin-top: 24rpx;
	}

	.record-left {
		gap: 18rpx;
		min-width: 0;
	}

	.record-icon {
		width: 52rpx;
		height: 52rpx;
		flex-shrink: 0;
	}

	.record-label {
		color: #4A3D2E;
		font-size: 25rpx;
	}

	.record-value {
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
		flex-shrink: 0;
	}

	.muted-text {
		color: #B9A88F;
	}

	.records-side {
		line-height: 1.4;
	}
</style>
