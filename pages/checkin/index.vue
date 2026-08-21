<template>
	<view class="wrap">
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
					<view class="avatar-head"></view>
					<view class="avatar-body"></view>
				</view>
			</view>

			<view class="center-panel">
				<text class="date-text">{{ dateText }}</text>
				<text class="time-text">{{ timeText }}</text>

				<view class="pulse-wrap">
					<view class="pulse-ring pulse-ring-outer"></view>
					<view class="pulse-ring pulse-ring-inner"></view>
					<view class="pulse-core" @click="mockCheckin">
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
					<text class="records-title">今日记录</text>
					<text class="records-side">查看全部</text>
				</view>

				<view class="record-row">
					<view class="record-left">
						<image class="record-icon" src="/static/icons/check-circle.svg" mode="aspectFit" />
						<text class="record-label">上班打卡</text>
					</view>
					<view class="record-right">
						<text class="record-value">{{ morningText }}</text>
						<text class="record-state success">✓</text>
					</view>
				</view>

				<view class="record-row">
					<view class="record-left">
						<image class="record-icon" src="/static/icons/clock.svg" mode="aspectFit" />
						<text class="record-label">下班打卡</text>
					</view>
					<view class="record-right">
						<text class="record-value muted-text">{{ eveningText }}</text>
						<text class="record-state muted-state">−</text>
					</view>
				</view>
			</view>
		</view>

		<view class="tabbar">
			<view class="tab-item active">
				<image class="tab-icon" src="/static/icons/home-active.svg" mode="aspectFit" />
				<text class="tab-label">首页</text>
			</view>
			<view class="tab-item">
				<image class="tab-icon" src="/static/icons/record-muted.svg" mode="aspectFit" />
				<text class="tab-label">记录</text>
			</view>
			<view class="tab-item">
				<image class="tab-icon" src="/static/icons/profile-muted.svg" mode="aspectFit" />
				<text class="tab-label">我的</text>
			</view>
		</view>

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
	import CheckinResult from '@/components/checkin-result/index.vue'
	import { clearPendingCheckinResult, clearSession, getPendingCheckinResult, getSession, getToken, setPendingCheckinResult } from '@/utils/session'
	import { BASE_URL } from '@/utils/config'
	import { formatClockTime, formatDateText } from '@/utils/time'

	export default {
		components: {
			CheckinResult
		},
		data() {
			return {
				userName: '',
				department: '',
				timeText: '',
				dateText: '',
				timer: null,
				resultVisible: false,
				morningText: '09:26',
				eveningText: '未打卡',
				result: {
					success: true,
					message: '',
					pointId: '',
					timeText: ''
				}
			}
		},
		onShow() {
			const { userName, department } = getSession()
			this.userName = userName
			this.department = department

			if (!this.userName || !this.department) {
				clearSession()
				this.goLogin()
				return
			}

			this.refreshClock()
			this.startClock()
			this.consumePendingResult()
		},
		onHide() {
			this.stopClock()
		},
		onUnload() {
			this.stopClock()
		},
		methods: {
			goLogin() {
				uni.reLaunch({
					url: '/pages/login/index'
				})
			},
			refreshClock() {
				const now = new Date()
				this.timeText = formatClockTime(now)
				this.dateText = formatDateText(now)
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
				clearPendingCheckinResult()
				this.goLogin()
			},
			mockCheckin() {
				const payload = {
					success: true,
					message: '已模拟完成一次打卡，可替换为真实设备回调结果',
					pointId: 'DEMO-01',
					time: Date.now()
				}

				setPendingCheckinResult(payload)
				this.consumePendingResult()
			},
			async consumePendingResult() {
				const payload = getPendingCheckinResult()

				if (!payload) {
					return
				}

				let success = payload.success !== false
				let message = payload.message || '打卡已受理'

				try {
					const loc = await uni.getLocation({ type: 'gcj02' })
					const res = await uni.request({
						url: BASE_URL + '/api/checkin',
						method: 'POST',
						header: { 'Authorization': 'Bearer ' + getToken() },
						data: {
							pointId: payload.pointId,
							longitude: loc.longitude,
							latitude: loc.latitude
						}
					})
					if (res.statusCode === 200 && res.data.code === 0) {
						success = true
						message = '打卡成功'
					} else {
						success = false
						message = res.data.msg || '打卡失败'
					}
				} catch (e) {
					success = false
					message = '定位或网络失败'
				}

				const date = new Date(payload.time || Date.now())
				const displayTime = formatClockTime(date)

				this.result = {
					success,
					message,
					pointId: payload.pointId || '',
					timeText: displayTime
				}

				if (this.morningText === '09:26' || this.morningText === '未打卡') {
					this.morningText = displayTime
				} else {
					this.eveningText = displayTime
				}

				this.resultVisible = true
				clearPendingCheckinResult()
			},
			closeResult() {
				this.resultVisible = false
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
		margin-top: 18rpx;
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
		padding: 22rpx 22rpx 12rpx;
		border-radius: 30rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 18rpx 50rpx rgba(31, 48, 95, 0.08);
		flex-shrink: 0;
	}

	.records-head,
	.record-row,
	.record-left,
	.record-right {
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

	.record-row + .record-row {
		margin-top: 24rpx;
		padding-top: 24rpx;
		border-top: 1rpx solid rgba(219, 226, 240, 0.8);
	}

	.record-left,
	.record-right {
		gap: 18rpx;
	}

	.record-icon {
		width: 52rpx;
		height: 52rpx;
	}

	.record-label {
		color: #2b3242;
		font-size: 28rpx;
	}

	.record-value {
		color: #182033;
		font-size: 28rpx;
		font-weight: 600;
	}

	.muted-text {
		color: #a0a8b8;
	}

	.record-state {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		font-size: 28rpx;
		font-weight: 700;
	}

	.success {
		background: #2f6dff;
		color: #ffffff;
	}

	.muted-state {
		background: #c2c7d2;
		color: #ffffff;
	}

	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: space-around;
		height: 116rpx;
		padding-bottom: env(safe-area-inset-bottom);
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 -8rpx 24rpx rgba(32, 44, 80, 0.06);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		color: #979fad;
	}

	.tab-item.active {
		color: #2f6dff;
	}

	.tab-icon {
		width: 58rpx;
		height: 58rpx;
	}

	.tab-label {
		font-size: 24rpx;
	}
</style>
