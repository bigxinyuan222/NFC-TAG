<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="hero">
			<view class="result-icon" :class="success ? 'icon-success' : 'icon-fail'">
				<text class="icon-mark">{{ success ? '✓' : '✕' }}</text>
			</view>
			<text class="result-title">{{ success ? '打卡成功' : '打卡失败' }}</text>
			<text class="result-sub">{{ success ? typeText + '已完成' : message }}</text>
		</view>

		<view class="card">
			<view class="info-row">
				<text class="info-label">打卡类型</text>
				<text class="info-value">{{ typeText }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">打卡时间</text>
				<text class="info-value">{{ dateText }} {{ weekText }} {{ timeText }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">姓名</text>
				<text class="info-value">{{ userName }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">部门</text>
				<text class="info-value">{{ department }}</text>
			</view>
			<view class="info-row" v-if="pointId">
				<text class="info-label">打卡点</text>
				<text class="info-value">{{ pointId }}</text>
			</view>
			<view class="info-row" v-if="message">
				<text class="info-label">备注</text>
				<text class="info-value">{{ message }}</text>
			</view>
		</view>

		<view class="submit-btn" @tap="goHome">返回首页</view>
	</view>
</template>

<script>
	import { getTheme } from '@/utils/theme'

	export default {
		data() {
			return {
				currentTheme: 'light',
				success: true,
				type: '',
				timeText: '',
				dateText: '',
				weekText: '',
				userName: '',
				department: '',
				pointId: '',
				message: ''
			}
		},
		computed: {
			typeText() {
				if (this.type === 'morning') {
					return '上班打卡'
				}
				if (this.type === 'evening') {
					return '下班打卡'
				}
				return '打卡'
			}
		},
		onLoad(options) {
			this.currentTheme = getTheme()
			let data = {}
			try {
				data = JSON.parse(decodeURIComponent(options.data || ''))
			} catch (e) {
				data = {}
			}
			this.success = data.success !== false
			this.type = data.type || ''
			this.timeText = data.timeText || ''
			this.dateText = data.dateText || ''
			this.weekText = data.weekText || ''
			this.userName = data.userName || ''
			this.department = data.department || ''
			this.pointId = data.pointId || ''
			this.message = data.message || ''
		},
		methods: {
			goHome() {
				uni.reLaunch({
					url: '/pages/checkin/index'
				})
			}
		}
	}
</script>

<style>
	page {
		background: #eef4ff;
	}

	.wrap {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100vh;
		height: 100dvh;
		padding: 140rpx 32rpx 40rpx;
		box-sizing: border-box;
		overflow: hidden;
		background: linear-gradient(180deg, #eef4ff 0%, #f7faff 66%, #edf3ff 100%);
	}

	.wrap::before {
		content: '';
		position: absolute;
		top: -60rpx;
		left: -10%;
		right: -10%;
		height: 420rpx;
		background: radial-gradient(circle at 50% 0, rgba(154, 186, 255, 0.5) 0, rgba(154, 186, 255, 0) 62%);
		pointer-events: none;
	}

	.hero {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.result-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 180rpx;
		height: 180rpx;
		border-radius: 50%;
	}

	.icon-success {
		background: linear-gradient(180deg, #70a1ff 0%, #2f6dff 100%);
		box-shadow: 0 24rpx 60rpx rgba(53, 89, 208, 0.35);
	}

	.icon-fail {
		background: linear-gradient(180deg, #ff9a9a 0%, #e05252 100%);
		box-shadow: 0 24rpx 60rpx rgba(208, 70, 70, 0.28);
	}

	.icon-mark {
		color: #ffffff;
		font-size: 92rpx;
		font-weight: 700;
		line-height: 1;
	}

	.result-title {
		margin-top: 40rpx;
		color: #182033;
		font-size: 48rpx;
		font-weight: 700;
	}

	.result-sub {
		margin-top: 16rpx;
		color: #7d879b;
		font-size: 26rpx;
	}

	.card {
		position: relative;
		z-index: 1;
		width: 100%;
		margin-top: 70rpx;
		padding: 10rpx 32rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 20rpx 60rpx rgba(86, 116, 191, 0.12);
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		padding: 30rpx 0;
	}

	.info-row + .info-row {
		border-top: 1rpx solid rgba(219, 226, 240, 0.8);
	}

	.info-label {
		flex-shrink: 0;
		color: #7d879b;
		font-size: 26rpx;
	}

	.info-value {
		color: #182033;
		font-size: 26rpx;
		font-weight: 600;
		text-align: right;
	}

	.submit-btn {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin-top: 70rpx;
		height: 88rpx;
		border-radius: 44rpx;
		background: linear-gradient(135deg, #3f6df6 0%, #2550d9 100%);
		box-shadow: 0 18rpx 36rpx rgba(56, 94, 214, 0.24);
		color: #ffffff;
		font-size: 30rpx;
		font-weight: 600;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .wrap::before {
		background: radial-gradient(circle at 50% 0, rgba(120, 120, 120, 0.18) 0, rgba(120, 120, 120, 0) 62%);
	}

	.theme-dark .result-title,
	.theme-dark .info-value {
		color: #f3f4f6;
	}

	.theme-dark .result-sub,
	.theme-dark .info-label {
		color: #9ca3af;
	}

	.theme-dark .card {
		background: rgba(24, 27, 33, 0.96);
		box-shadow: none;
	}

	.theme-dark .info-row + .info-row {
		border-top: 1rpx solid #2a2f37;
	}

	.theme-dark .submit-btn {
		background: linear-gradient(135deg, #2b2f36 0%, #16181d 100%);
		box-shadow: none;
	}
</style>
