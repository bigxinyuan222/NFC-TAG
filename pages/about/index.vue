<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">关于我们</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="about-card">
			<text class="brand">乐知智能考勤</text>
			<text class="desc">乐知智能考勤是一款面向企业日常出勤场景的移动端应用，专注于提供简洁、稳定、直观的打卡记录与个人信息管理体验。</text>
			<text class="desc">当前版本覆盖员工登录、上下班打卡、历史记录查看、个人资料维护以及主题切换等基础功能。</text>
		</view>
	</view>
</template>

<script>
	import { getTheme } from '@/utils/theme'

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

	.about-card {
		margin-top: 28rpx;
		padding: 34rpx 30rpx;
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(84, 102, 139, 0.08);
	}

	.brand {
		display: block;
		color: #111827;
		font-size: 34rpx;
		font-weight: 700;
	}

	.desc {
		display: block;
		margin-top: 18rpx;
		color: #4b5563;
		font-size: 26rpx;
		line-height: 1.7;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .brand {
		color: #f3f4f6;
	}

	.theme-dark .about-card {
		background: rgba(27, 31, 38, 0.96);
		box-shadow: none;
	}

	.theme-dark .desc {
		color: #c2c8d1;
	}
</style>
