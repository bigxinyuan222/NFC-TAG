<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">系统设置</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="panel">
			<view class="setting-row">
				<view>
					<text class="setting-title">黑白主题</text>
					<text class="setting-desc">开启后切换为深色黑白界面</text>
				</view>
				<switch :checked="currentTheme === 'dark'" color="#111111" @change="handleThemeChange" />
			</view>
		</view>
	</view>
</template>

<script>
	import { getTheme, saveTheme } from '@/utils/theme'

	export default {
		data() {
			return {
				currentTheme: 'light'
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
			handleThemeChange(event) {
				this.currentTheme = event.detail.value ? 'dark' : 'light'
				saveTheme(this.currentTheme)
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

		.nav-back,
		.nav-icon,
		.nav-placeholder {
			width: 72rpx;
			height: 72rpx;
		}

		.nav-back {
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

	.panel {
		margin-top: 28rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(84, 102, 139, 0.08);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx;
	}

	.setting-title {
		display: block;
		color: #111827;
		font-size: 28rpx;
		font-weight: 600;
	}

	.setting-desc {
		display: block;
		margin-top: 10rpx;
		color: #8b95a7;
		font-size: 22rpx;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .setting-title {
		color: #f3f4f6;
	}

	.theme-dark .panel {
		background: rgba(27, 31, 38, 0.96);
		box-shadow: none;
	}

	.theme-dark .setting-desc {
		color: #9ca3af;
	}
</style>
