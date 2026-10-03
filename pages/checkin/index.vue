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
					<view class="pulse-core" @click="handleCheckin">
						<view class="pulse-icon">
							<image class="pulse-wave" src="/static/icons/checkin-wave.svg" mode="aspectFit" />
						</view>
						<text class="pulse-label">碰一下打卡</text>
					</view>
				</view>

				<view class="tip-row">
					<text class="tip-dot"></text>
					<text class="tip">请靠近打卡设备</text>
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
						<text class="record-label" :class="{ 'muted-text': !latestSuccessTime }">{{ latestSuccessTime ? '今日最近一次成功打卡' : '本机今日暂无成功打卡' }}</text>
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
	import { clearPendingCheckinResult, clearSession, getPendingCheckinResult, getSession, getToken, setPendingCheckinResult } from '@/utils/session'
	import { BASE_URL } from '@/utils/config'
	import { AUTO_CHECKIN_SLOTS, getCheckinSlotDate, getTodayCheckinSummary, getUserCheckinRecords, isCheckinSlotMatched, normalizeRemoteCheckinRecords, saveCheckinRecord } from '@/utils/checkin-record'
	import { getMyCheckins } from '@/utils/checkin-api'
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
				autoWindowKey: '',
				pageVisible: false,
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

			if (!this.userName || !this.department) {
				clearSession()
				this.goLogin()
				return
			}

			this.refreshClock()
			this.refreshTodaySummary()
			this.startClock()
			this.consumePendingResult()
			this.checkAutoCheckin()
		},
		onHide() {
			this.pageVisible = false
			this.autoWindowKey = ''
			this.stopClock()
		},
		onUnload() {
			this.pageVisible = false
			this.autoWindowKey = ''
			this.stopClock()
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
					this.checkAutoCheckin()
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
				clearPendingCheckinResult()
				this.goLogin()
			},
			handleCheckin() {
				if (this.isCheckingIn) {
					return
				}

				const payload = {
					success: false,
					message: '正在获取位置并提交打卡',
					pointId: 'point-001',
					time: Date.now()
				}

				setPendingCheckinResult(payload)
				this.consumePendingResult()
			},
			async consumePendingResult() {
				const payload = getPendingCheckinResult()

				if (!payload || this.isCheckingIn) {
					return
				}

				await this.submitCheckin(payload, true)
				clearPendingCheckinResult()
			},
			async checkAutoCheckin() {
				if (!this.pageVisible || this.isCheckingIn || !getToken()) return
				const now = new Date()
				const slot = AUTO_CHECKIN_SLOTS.find((item) => {
					const scheduled = getCheckinSlotDate(now, item).getTime()
					return now.getTime() >= scheduled - 10 * 60 * 1000 && now.getTime() < scheduled
				})
				if (!slot) return
				const dateKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
				const windowKey = dateKey + ' ' + slot.time
				if (this.autoWindowKey === windowKey) return
				this.autoWindowKey = windowKey

				const session = { userName: this.userName, department: this.department }
				const localRecords = getUserCheckinRecords(session)
				if (isCheckinSlotMatched(localRecords, now, slot)) return

				try {
					const remoteRecords = await this.loadRemoteRecordsForAuto()
					if (!this.pageVisible || isCheckinSlotMatched(remoteRecords, now, slot)) return
					await this.submitCheckin({
						success: false,
						message: '正在自动打卡',
						pointId: slot.pointId,
						time: Date.now(),
						source: 'auto',
						slotTime: slot.time
					}, false)
				} catch (error) {
					if (error && error.isAuthError) {
						clearSession()
						this.goLogin()
						return
					}
					console.error('[自动打卡检查失败]', error)
				}
			},
			async loadRemoteRecordsForAuto() {
				const records = []
				let page = 1
				const pageSize = 100
			while (true) {
					const result = await getMyCheckins({ page, pageSize })
					records.push.apply(records, normalizeRemoteCheckinRecords(result.items, {
						userName: this.userName,
						department: this.department
					}))
					const currentPage = Number(result.page) || page
					const currentPageSize = Number(result.pageSize) || pageSize
					const total = Number(result.total) || 0
					if (total === 0 || currentPage * currentPageSize >= total) break
					if (!result.items.length) throw new Error('签到记录分页不完整')
					page = currentPage + 1
				}
				return records
			},
			async submitCheckin(payload, showResult) {
				this.isCheckingIn = true
				let success = false
				let message = payload.message || '打卡失败'
				let distanceMeters = null
				let maxDistanceMeters = null

				try {
					const token = getToken()
					if (!token) {
						throw new Error('登录状态已失效，请重新登录')
					}
					if (!payload.pointId) {
						throw new Error('未识别到有效的打卡点')
					}

					const loc = await uni.getLocation({ type: 'wgs84' })
					const res = await uni.request({
						url: BASE_URL + '/api/checkin',
						method: 'POST',
						header: {
							'Authorization': 'Bearer ' + token,
							'Content-Type': 'application/json'
						},
						data: {
							pointId: payload.pointId,
							longitude: loc.longitude,
							latitude: loc.latitude
						}
					})
					const body = res.data && typeof res.data === 'object' ? res.data : {}
					if (res.statusCode === 200 && body.code === 0) {
						success = true
						message = body.msg || '打卡成功'
						distanceMeters = body.data && body.data.distanceMeters
						maxDistanceMeters = body.data && body.data.maxDistanceMeters
						console.log('[打卡成功]', {
							pointId: payload.pointId,
							longitude: loc.longitude,
							latitude: loc.latitude,
							response: body
						})
					} else {
						message = body.msg || '打卡失败'
						console.error('[打卡接口响应失败]', {
							url: BASE_URL + '/api/checkin',
							statusCode: res.statusCode,
							response: res.data,
							pointId: payload.pointId,
							longitude: loc.longitude,
							latitude: loc.latitude
						})
					}
				} catch (e) {
					message = e && (e.message || e.errMsg) ? (e.message || e.errMsg) : '定位或网络失败'
					console.error('[打卡失败原因]', message)
					console.error('[打卡失败]', {
						pointId: payload.pointId || '',
						error: e
					})
				}

				const date = new Date(payload.time || Date.now())
				const displayTime = formatClockTime(date)

				this.result = {
					success,
					message,
					pointId: payload.pointId || '',
					timeText: displayTime
				}

				saveCheckinRecord({
					userName: this.userName,
					department: this.department
				}, {
					pointId: payload.pointId || '',
					time: payload.time || Date.now(),
					success,
					message,
					distanceMeters,
					maxDistanceMeters,
					source: payload.source || 'api'
				})
				this.refreshTodaySummary()

				if (showResult) this.resultVisible = true
				this.isCheckingIn = false
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
		background: #eef4ff;
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		padding: 24rpx 24rpx 112rpx;
		background: linear-gradient(180deg, #eef4ff 0%, #f7faff 66%, #edf3ff 100%);
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
		color: #182033;
		font-size: 52rpx;
		font-weight: 700;
	}

	.name {
		color: #2f6dff;
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
		color: #7a849a;
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
		box-shadow: 0 10rpx 24rpx rgba(91, 118, 183, 0.12);
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
		background: #2f6dff;
	}

	.avatar-body {
		position: absolute;
		left: 50%;
		bottom: 14rpx;
		width: 42rpx;
		height: 24rpx;
		margin-left: -21rpx;
		border-radius: 24rpx 24rpx 18rpx 18rpx;
		background: #2f6dff;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .title,
	.theme-dark .time-text,
	.theme-dark .records-title,
	.theme-dark .record-label,
	.theme-dark .record-value {
		color: #f3f4f6;
	}

	.theme-dark .subtitle,
	.theme-dark .date-text,
	.theme-dark .tip,
	.theme-dark .records-side,
	.theme-dark .muted-text {
		color: #9ca3af;
	}

	.theme-dark .card,
	.theme-dark .avatar {
		background: rgba(24, 27, 33, 0.96);
		box-shadow: none;
	}

	.center-panel {
		margin-top: 66rpx;
		text-align: center;
		flex-shrink: 0;
	}

	.date-text {
		display: block;
		color: #6d7891;
		font-size: 26rpx;
	}

	.time-text {
		display: block;
		margin-top: 8rpx;
		color: #111827;
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
		background: rgba(63, 109, 246, 0.05);
	}

	.pulse-ring-inner {
		width: 400rpx;
		height: 400rpx;
		background: rgba(63, 109, 246, 0.08);
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
		background: linear-gradient(180deg, #70a1ff 0%, #2f6dff 100%);
		box-shadow: 0 18rpx 44rpx rgba(53, 89, 208, 0.22);
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
		border: 4rpx solid #9ab8ff;
		border-radius: 50%;
		box-shadow: 0 0 0 8rpx rgba(154, 184, 255, 0.18);
	}

	.tip {
		color: #3558c3;
		font-size: 30rpx;
		font-weight: 600;
	}

	.card {
		margin-top: 100rpx;
		padding: 22rpx 22rpx 28rpx;
		border-radius: 30rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 18rpx 50rpx rgba(31, 48, 95, 0.08);
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
		color: #182033;
		font-size: 30rpx;
		font-weight: 700;
	}

	.records-side {
		color: #8c96aa;
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
		color: #2b3242;
		font-size: 25rpx;
	}

	.record-value {
		color: #182033;
		font-size: 32rpx;
		font-weight: 600;
		flex-shrink: 0;
	}

	.muted-text {
		color: #a0a8b8;
	}

	.records-side {
		line-height: 1.4;
	}
</style>
