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
		background: #FDF6E9;
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		padding: 88rpx 32rpx 32rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #FFF9EF 0%, #FDF3E4 60%, #FBEDD9 100%);
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
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
	}

	.nav-action {
		min-width: 72rpx;
		text-align: right;
		color: #F59A23;
		font-size: 28rpx;
		font-weight: 600;
	}

	.panel {
		margin-top: 28rpx;
		padding: 32rpx 28rpx 28rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(212, 162, 94, 0.12);
	}

	.panel-title {
		display: block;
		color: #3D3226;
		font-size: 30rpx;
		font-weight: 700;
	}

	.panel-desc {
		display: block;
		margin-top: 14rpx;
		color: #7A6650;
		font-size: 24rpx;
		line-height: 1.7;
	}

	.feedback-input {
		width: 100%;
		height: 360rpx;
		margin-top: 24rpx;
		padding: 22rpx;
		border-radius: 24rpx;
		background: #fffaf2;
		color: #3D3226;
		font-size: 26rpx;
		line-height: 1.7;
		box-sizing: border-box;
	}

	.feedback-placeholder {
		color: #B9A88F;
	}

	.count-text {
		display: block;
		margin-top: 14rpx;
		text-align: right;
		color: #A08C77;
		font-size: 22rpx;
	}

	.theme-dark {
		background: linear-gradient(180deg, #211A14 0%, #2A211A 55%, #211A14 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .panel-title,
	.theme-dark .feedback-input {
		color: #F5E9D9;
	}

	.theme-dark .nav-action {
		color: #F5A623;
	}

	.theme-dark .panel {
		background: rgba(48, 39, 31, 0.96);
		box-shadow: none;
	}

	.theme-dark .panel-desc,
	.theme-dark .count-text {
		color: #B09A83;
	}

	.theme-dark .feedback-input {
		background: #2A2219;
	}

	.theme-dark .feedback-placeholder {
		color: #8A7761;
	}
</style>
