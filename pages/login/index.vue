<template>
	<view class="wrap">
		<view class="main-shell">
			<view class="hero">
				<view class="logo-shell">
					<view class="logo-core">
						<text class="logo-mark">乐知</text>
					</view>
				</view>
				<text class="welcome">欢迎使用</text>
				<text class="title">智能打卡系统</text>
				<text class="subtitle">简单 · 高效 · 准确</text>
			</view>

			<view class="card">
				<view class="field">
					<text class="label">姓名</text>
					<view class="input-wrap">
						<image class="input-icon" src="/static/icons/user.svg" mode="aspectFit" />
						<input class="input" :value="form.userName" @input="handleNameInput" placeholder="请输入姓名" placeholder-class="input-placeholder" />
					</view>
				</view>

				<view class="field">
					<text class="label">部门</text>
					<view class="input-wrap">
						<image class="input-icon" src="/static/icons/building.svg" mode="aspectFit" />
						<input class="input" :value="form.department" @input="handleDepartmentInput" placeholder="请选择部门" placeholder-class="input-placeholder" />
					</view>
				</view>

				<view class="submit-btn" @tap.stop="register">进入系统</view>
			</view>
		</view>

		<view class="safety">
			<image class="safety-icon" src="/static/icons/shield.svg" mode="aspectFit" />
			<text class="safety-text">数据安全保障中</text>
		</view>

		<text class="copyright">© 2026 乐知智能考勤 版权所有</text>
	</view>
</template>

<script>
	import { getSession, hasSession, saveSession } from '@/utils/session'
	import { BASE_URL } from '@/utils/config'

	export default {
		data() {
			return {
				form: {
					userName: '',
					department: ''
				},
				isSubmitting: false
			}
		},
		onShow() {
			if (hasSession()) {
				uni.reLaunch({
					url: '/pages/checkin/index'
				})
				return
			}

			const { userName, department } = getSession()
			this.form.userName = userName
			this.form.department = department
		},
		methods: {
			handleNameInput(event) {
				this.form.userName = event.detail.value
			},
			handleDepartmentInput(event) {
				this.form.department = event.detail.value
			},
			async register() {
				if (this.isSubmitting) {
					return
				}

				uni.hideKeyboard()

				const userName = (this.form.userName || '').trim()
				const department = (this.form.department || '').trim()

				if (!userName || !department) {
					uni.showToast({
						title: '请填写完整信息',
						icon: 'none'
					})
					return
				}

				this.isSubmitting = true
				try {
					const res = await uni.request({
						url: BASE_URL + '/api/login',
						method: 'POST',
						data: { userName, department }
					})
					if (res.statusCode === 200 && res.data.code === 0) {
						const d = res.data.data
						saveSession({ userName: d.userName, department: d.department, token: d.token })
						uni.reLaunch({ url: '/pages/checkin/index' })
					} else {
						uni.showToast({ title: res.data.msg || '登记失败', icon: 'none' })
					}
				} catch (e) {
					uni.showToast({ title: '网络错误', icon: 'none' })
				}
				this.isSubmitting = false
			}
		}
	}
</script>

<style>
	page {
		background: #eef4ff;
	}

	.wrap {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		padding: 28rpx 28rpx 24rpx;
		overflow: hidden;
		background: linear-gradient(180deg, #eef4ff 0%, #f7faff 66%, #edf3ff 100%);
		box-sizing: border-box;
	}

	.main-shell {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding-top: 0rpx;
		padding-bottom: 80rpx;
	}

	.wrap::before,
	.wrap::after {
		content: '';
		position: absolute;
		left: -10%;
		right: -10%;
		pointer-events: none;
	}

	.wrap::before {
		top: -40rpx;
		height: 360rpx;
		background: radial-gradient(circle at 50% 0, rgba(154, 186, 255, 0.55) 0, rgba(154, 186, 255, 0) 62%);
	}

	.wrap::after {
		bottom: -80rpx;
		height: 280rpx;
		background: radial-gradient(circle at 50% 100%, rgba(185, 206, 255, 0.45) 0, rgba(185, 206, 255, 0) 68%);
	}

	.hero {
		position: relative;
		margin-top: 0;
		flex-shrink: 0;
		text-align: center;
	}

	.logo-shell {
		display: flex;
		justify-content: center;
	}

	.logo-core {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 140rpx;
		height: 140rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 18rpx 50rpx rgba(94, 128, 214, 0.18);
	}

	.logo-mark {
		padding: 26rpx 22rpx;
		border-radius: 26rpx;
		background: linear-gradient(180deg, #6ea0ff 0%, #2f6dff 100%);
		color: #ffffff;
		font-size: 26rpx;
		font-weight: 700;
	}

	.welcome {
		display: block;
		margin-top: 24rpx;
		color: #4b5d8e;
		font-size: 44rpx;
		font-weight: 700;
		line-height: 1.25;
	}

	.title {
		display: block;
		margin-top: 8rpx;
		color: #2f6dff;
		font-size: 50rpx;
		font-weight: 700;
		line-height: 1.18;
	}

	.subtitle {
		display: block;
		margin-top: 14rpx;
		color: #7d879b;
		font-size: 22rpx;
	}

	.card {
		position: relative;
		margin-top: 80rpx;
		padding: 34rpx 32rpx 30rpx;
		margin-left: 18rpx;
		margin-right: 18rpx;
		border-radius: 36rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 20rpx 60rpx rgba(86, 116, 191, 0.12);
		flex-shrink: 0;
	}

	.field + .field {
		margin-top: 60rpx;
	}

	.label {
		display: block;
		margin-bottom: 12rpx;
		color: #1d2433;
		font-size: 26rpx;
		font-weight: 600;
	}

	.input-wrap {
		display: flex;
		align-items: center;
		height: 88rpx;
		padding: 0 20rpx;
		border: 1rpx solid #e5eaf5;
		border-radius: 22rpx;
		background: #ffffff;
	}

	.input-icon {
		flex-shrink: 0;
		width: 46rpx;
		height: 46rpx;
	}

	.input {
		flex: 1;
		height: 88rpx;
		padding-left: 16rpx;
		background: transparent;
		color: #182033;
		font-size: 26rpx;
	}

	.input-placeholder {
		color: #b3bac8;
		font-size: 26rpx;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 60rpx;
		height: 84rpx;
		border-radius: 42rpx;
		background: linear-gradient(135deg, #3f6df6 0%, #2550d9 100%);
		box-shadow: 0 18rpx 36rpx rgba(56, 94, 214, 0.24);
		color: #ffffff;
		font-size: 30rpx;
		font-weight: 600;
	}

	.safety {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		margin-top: auto;
		padding-top: 0;
	}

	.safety-text {
		color: #9099ac;
		font-size: 24rpx;
	}

	.safety-icon {
		width: 28rpx;
		height: 28rpx;
		flex-shrink: 0;
	}

	.copyright {
		position: relative;
		z-index: 1;
		display: block;
		margin-top: 12rpx;
		color: #a0a8b8;
		font-size: 22rpx;
		text-align: center;
	}
</style>
