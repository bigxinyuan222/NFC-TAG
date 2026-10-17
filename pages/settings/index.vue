<template>
	<view class="wrap">
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
			</view>
			<text class="nav-title">系统设置</text>
			<view class="nav-placeholder"></view>
		</view>
	</view>
</template>

<script>
	export default {
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
</style>
