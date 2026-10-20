<template>
	<view class="wrap" :class="skinClass">
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
					<text class="setting-title">配色</text>
					<text class="setting-desc">当前 {{ currentSkinName }}</text>
				</view>
				<view class="skin-picker">
					<view
						v-for="item in skinOptions"
						:key="item.id"
						class="skin-swatch"
						:class="{ 'skin-swatch--active': skinId === item.id }"
						:style="{ backgroundColor: item.dot }"
						@tap="handleSkinChange(item.id)"
					></view>
				</view>
			</view>
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
	import { SKINS, getSkin, saveSkinId } from '@/utils/skin'

	export default {
		data() {
			return {
				version: APP_VERSION,
				checking: false,
				skinOptions: SKINS,
				skinId: 'sunny',
				skinClass: 'skin-sunny'
			}
		},
		computed: {
			currentSkinName() {
				const skin = SKINS.find((item) => item.id === this.skinId)
				return skin ? skin.name : ''
			}
		},
		onShow() {
			this.syncSkin()
		},
		methods: {
			syncSkin() {
				const skin = getSkin()
				this.skinId = skin.id
				this.skinClass = skin.className
			},
			handleSkinChange(id) {
				if (this.skinId === id) return
				saveSkinId(id)
				this.syncSkin()
			},
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
		background: var(--sk-page-bg);
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		padding: 88rpx 32rpx 32rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 60%, var(--sk-bg-3) 100%);
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
		color: var(--sk-text);
		font-size: 32rpx;
		font-weight: 600;
	}

	.panel {
		margin-top: 28rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx var(--sk-shadow);
		overflow: hidden;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx;
	}

	.setting-row + .setting-row {
		border-top: 1rpx solid var(--sk-border);
	}

	.setting-main {
		flex: 1;
		min-width: 0;
	}

	.setting-title {
		display: block;
		color: var(--sk-text);
		font-size: 28rpx;
		font-weight: 600;
	}

	.setting-desc {
		display: block;
		margin-top: 10rpx;
		color: var(--sk-text-muted);
		font-size: 22rpx;
	}

	.setting-value {
		color: var(--sk-text-muted);
		font-size: 26rpx;
	}

	.skin-picker {
		display: flex;
		align-items: center;
		gap: 20rpx;
		flex-shrink: 0;
	}

	.skin-swatch {
		width: 44rpx;
		height: 44rpx;
		border-radius: 50%;
		transition: box-shadow 0.2s ease;
	}

	/* 选中项用当前皮肤强调色描环，与所选色块同色 */
	.skin-swatch--active {
		box-shadow: 0 0 0 4rpx var(--sk-accent);
	}

	.row-arrow {
		width: 34rpx;
		height: 34rpx;
		flex-shrink: 0;
	}
</style>
