<template>
	<view class="wrap" :class="skinClass">
		<view class="status-bar"></view>
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">关于我们</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="about-card">
			<text class="brand">喵呜打卡</text>
			<text class="desc">喵呜打卡是一款面向企业日常出勤场景的移动端应用，专注于提供简洁、稳定、直观的打卡记录与个人信息管理体验。</text>
			<text class="desc">当前版本覆盖员工登录、上班打卡、历史记录查看、个人资料维护以及主题切换等基础功能。</text>
		</view>
	</view>
</template>

<script>
	import { getSkinClass } from '@/utils/skin'

	export default {
		data() {
			return {
				skinClass: 'skin-sunny'
			}
		},
		onShow() {
			this.skinClass = getSkinClass()
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
		padding: 0 32rpx 32rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 60%, var(--sk-bg-3) 100%);
	}

	.status-bar {
		height: var(--status-bar-height);
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

	.about-card {
		margin-top: 28rpx;
		padding: 34rpx 30rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx var(--sk-shadow);
	}

	.brand {
		display: block;
		color: var(--sk-text);
		font-size: 34rpx;
		font-weight: 700;
	}

	.desc {
		display: block;
		margin-top: 18rpx;
		color: var(--sk-text-3);
		font-size: 26rpx;
		line-height: 1.7;
	}

</style>
