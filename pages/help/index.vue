<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">帮助与反馈</text>
			<text class="nav-action" @tap="submitFeedback">提交</text>
		</view>

		<view class="panel">
			<text class="panel-title">你的意见对我们很重要</text>
			<text class="panel-desc">可以在这里描述使用问题、功能建议，或者你希望我们改进的地方。</text>
			<textarea
				class="feedback-input"
				:value="content"
				@input="handleInput"
				placeholder="请输入你的意见或建议"
				placeholder-class="feedback-placeholder"
				maxlength="500"
			/>
			<text class="count-text">{{ content.length }}/500</text>
		</view>
	</view>
</template>

<script>
	import { getTheme } from '@/utils/theme'

	export default {
		data() {
			return {
				currentTheme: 'light',
				content: ''
			}
		},
		onShow() {
			this.currentTheme = getTheme()
		},
		methods: {
			goBack() {
				uni.navigateBack({
					fail: () => {
						uni.reLaunch({
							url: '/pages/profile/index'
						})
					}
				})
			},
			handleInput(event) {
				this.content = event.detail.value
			},
			submitFeedback() {
				const text = (this.content || '').trim()

				if (!text) {
					uni.showToast({
						title: '请输入反馈内容',
						icon: 'none'
					})
					return
				}

				uni.showToast({
					title: '反馈已收到',
					icon: 'success'
				})
				this.content = ''
			}
		}
	}
</script>

<style>
	page {
		background: #f6f8fc;
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		padding: 88rpx 32rpx 32rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #ffffff 0%, #f7faff 52%, #ffffff 100%);
	}

	.nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nav-back {
		width: 72rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.nav-icon {
		width: 40rpx;
		height: 40rpx;
	}

	.nav-title {
		color: #1f2937;
		font-size: 32rpx;
		font-weight: 600;
	}

	.nav-action {
		min-width: 72rpx;
		text-align: right;
		color: #3b82f6;
		font-size: 28rpx;
		font-weight: 600;
	}

	.panel {
		margin-top: 28rpx;
		padding: 32rpx 28rpx 28rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(84, 102, 139, 0.08);
	}

	.panel-title {
		display: block;
		color: #111827;
		font-size: 30rpx;
		font-weight: 700;
	}

	.panel-desc {
		display: block;
		margin-top: 14rpx;
		color: #6b7280;
		font-size: 24rpx;
		line-height: 1.7;
	}

	.feedback-input {
		width: 100%;
		height: 360rpx;
		margin-top: 24rpx;
		padding: 22rpx;
		border-radius: 24rpx;
		background: #f7f9fc;
		color: #111827;
		font-size: 26rpx;
		line-height: 1.7;
		box-sizing: border-box;
	}

	.feedback-placeholder {
		color: #b6becb;
	}

	.count-text {
		display: block;
		margin-top: 14rpx;
		text-align: right;
		color: #9ca3af;
		font-size: 22rpx;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .panel-title,
	.theme-dark .feedback-input {
		color: #f3f4f6;
	}

	.theme-dark .nav-action {
		color: #e5e7eb;
	}

	.theme-dark .panel {
		background: rgba(27, 31, 38, 0.96);
		box-shadow: none;
	}

	.theme-dark .panel-desc,
	.theme-dark .count-text {
		color: #9ca3af;
	}

	.theme-dark .feedback-input {
		background: #111318;
	}

	.theme-dark .feedback-placeholder {
		color: #6b7280;
	}
</style>
