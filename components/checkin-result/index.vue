<template>
	<view v-if="visible" class="mask" @click.self="handleClose">
		<view class="panel">
			<view v-if="success" class="result-cat-wrap">
				<image class="result-sparkle result-sparkle-1" :src="catAssets.sparkle.src" mode="aspectFit" />
				<image class="result-sparkle result-sparkle-2" :src="catAssets.sparkle.src" mode="aspectFit" />
				<image class="result-success-cat" :src="catAssets.cheer.src" mode="aspectFit" />
			</view>
			<view class="badge" :class="success ? 'badge-success' : 'badge-fail'">
				<text class="badge-text">{{ success ? '成功' : '失败' }}</text>
			</view>
			<text class="title">{{ success ? '打卡已完成' : '打卡未完成' }}</text>
			<text class="message">{{ message }}</text>
			<text v-if="pointId" class="meta">打卡点：{{ pointId }}</text>
			<text v-if="timeText" class="meta">时间：{{ timeText }}</text>
			<button class="action" @click="handleClose">我知道了</button>
		</view>
	</view>
</template>

<script>
	import catAssets from '@/utils/cat-assets'

	export default {
		data() {
			return { catAssets }
		},
		props: {
			visible: {
				type: Boolean,
				default: false
			},
			success: {
				type: Boolean,
				default: true
			},
			message: {
				type: String,
				default: ''
			},
			pointId: {
				type: String,
				default: ''
			},
			timeText: {
				type: String,
				default: ''
			}
		},
		methods: {
			handleClose() {
				this.$emit('close')
			}
		}
	}
</script>

<style>
	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32rpx;
		background: rgba(33, 26, 20, 0.34);
		z-index: 99;
	}

	.panel {
		width: 100%;
		padding: 42rpx 34rpx 34rpx;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 24rpx 54rpx var(--sk-shadow-xl);
		text-align: center;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 120rpx;
		height: 56rpx;
		padding: 0 20rpx;
		border-radius: 999rpx;
	}

	.badge-success {
		background: var(--sk-success-tint);
	}

	.badge-fail {
		background: var(--sk-danger-tint);
	}

	.badge-text {
		font-size: 24rpx;
		font-weight: 600;
		color: var(--sk-success);
	}

	.badge-fail .badge-text {
		color: var(--sk-danger);
	}

	.result-cat-wrap {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		height: 200rpx;
		margin-bottom: 8rpx;
	}

	.result-success-cat {
		width: 220rpx;
		height: 220rpx;
		animation: cat-pop 0.5s ease-out both;
	}

	.result-sparkle {
		position: absolute;
		width: 44rpx;
		height: 44rpx;
		pointer-events: none;
		animation: sparkle-twinkle 1.6s ease-in-out infinite;
	}

	.result-sparkle-1 {
		top: 30rpx;
		left: 60rpx;
	}

	.result-sparkle-2 {
		top: 56rpx;
		right: 60rpx;
		animation-delay: 0.7s;
	}

	.title {
		display: block;
		margin-top: 24rpx;
		color: var(--sk-text);
		font-size: 36rpx;
		font-weight: 700;
	}

	.message {
		display: block;
		margin-top: 18rpx;
		color: var(--sk-text-3);
		font-size: 26rpx;
		line-height: 1.7;
	}

	.meta {
		display: block;
		margin-top: 14rpx;
		color: var(--sk-text-muted);
		font-size: 24rpx;
	}

	.action {
		margin-top: 30rpx;
		height: 88rpx;
		line-height: 88rpx;
		border: 0;
		border-radius: 20rpx;
		background: linear-gradient(135deg, var(--sk-accent-light) 0%, var(--sk-accent) 100%);
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

	.action::after {
		border: 0;
	}
</style>
