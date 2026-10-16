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
				<switch :checked="currentTheme === 'dark'" color="#F59A23" @change="handleThemeChange" />
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
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
	}

	.panel {
		margin-top: 28rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(212, 162, 94, 0.12);
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx;
	}

	.setting-title {
		display: block;
		color: #3D3226;
		font-size: 28rpx;
		font-weight: 600;
	}

	.setting-desc {
		display: block;
		margin-top: 10rpx;
		color: #A08C77;
		font-size: 22rpx;
	}

	.theme-dark {
		background: linear-gradient(180deg, #211A14 0%, #2A211A 55%, #211A14 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .setting-title {
		color: #F5E9D9;
	}

	.theme-dark .panel {
		background: rgba(48, 39, 31, 0.96);
		box-shadow: none;
	}

	.theme-dark .setting-desc {
		color: #B09A83;
	}
</style>
