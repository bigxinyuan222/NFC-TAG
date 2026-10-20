<template>
	<view class="wrap">
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">系统设置</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="panel">
			<view class="setting-row">
				<view class="setting-main">
					<text class="setting-title">当前版本</text>
					<text class="setting-desc">喵呜打卡</text>
				</view>
				<text class="setting-value">v{{ version }}</text>
			</view>
			<view class="setting-row" @tap="checkUpdate">
				<view class="setting-main">
					<text class="setting-title">检查更新</text>
					<text class="setting-desc">获取最新版本</text>
				</view>
				<image class="row-arrow" src="/static/icons/menu-chevron-right.svg" mode="aspectFit" />
			</view>
		</view>
	</view>
</template>

<script>
	import { APP_VERSION } from '@/utils/config'

	export default {
		data() {
			return {
				version: APP_VERSION,
				checking: false
			}
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
			checkUpdate() {
				if (this.checking) return
				const updateManager = uni.getUpdateManager && uni.getUpdateManager()

				if (!updateManager) {
					uni.showToast({
						title: '当前已是最新版本',
						icon: 'none'
					})
					return
				}

				this.checking = true
				uni.showLoading({
					title: '检查更新中',
					mask: true
				})
				updateManager.onCheckForUpdate((res) => {
					uni.hideLoading()
					this.checking = false
					if (!res.hasUpdate) {
						uni.showToast({
							title: '当前已是最新版本',
							icon: 'none'
						})
					}
				})
				updateManager.onUpdateReady(() => {
					uni.hideLoading()
					this.checking = false
					uni.showModal({
						title: '发现新版本',
						content: '新版本已下载完成，是否立即重启应用？',
						success: (res) => {
							if (res.confirm) updateManager.applyUpdate()
						}
					})
				})
				updateManager.onUpdateFailed(() => {
					uni.hideLoading()
					this.checking = false
					uni.showToast({
						title: '新版本下载失败，请稍后重试',
						icon: 'none'
					})
				})
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
		overflow: hidden;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx;
	}

	.setting-row + .setting-row {
		border-top: 1rpx solid rgba(242, 231, 213, 0.92);
	}

	.setting-main {
		flex: 1;
		min-width: 0;
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

	.setting-value {
		color: #A08C77;
		font-size: 26rpx;
	}

	.row-arrow {
		width: 34rpx;
		height: 34rpx;
		flex-shrink: 0;
	}
</style>
