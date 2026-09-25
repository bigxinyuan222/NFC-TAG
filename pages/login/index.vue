<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
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
					<text class="label">密码</text>
					<view class="input-wrap">
						<image class="input-icon" src="/static/icons/shield.svg" mode="aspectFit" />
						<input class="input" :value="form.password" @input="handlePasswordInput" placeholder="请输入密码" placeholder-class="input-placeholder" password />
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
	import { getTheme } from '@/utils/theme'

	export default {
		data() {
			return {
				currentTheme: 'light',
				form: {
					userName: '',
					department: '',
					password: ''
				},
				isSubmitting: false
			}
		},
		onShow() {
			this.currentTheme = getTheme()
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
			handlePasswordInput(event) {
				this.form.password = event.detail.value
			},
			async register() {
				if (this.isSubmitting) {
					return
				}

				uni.hideKeyboard()

				const userName = (this.form.userName || '').trim()
				const department = (this.form.department || '').trim()
				const password = (this.form.password || '').trim()

				if (!userName || !department || !password) {
					uni.showToast({
						title: '请填写完整信息',
						icon: 'none'
					})
					return
				}

				this.isSubmitting = true
				// 后端接口暂未就绪，测试阶段直接保存本地会话进入主界面
				saveSession({
					userName,
					department,
					token: 'local-test-token'
				})
				uni.reLaunch({ url: '/pages/checkin/index' })
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
		padding: 100rpx 28rpx 24rpx;
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
		margin-top: 60rpx;
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

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .wrap::before {
		background: radial-gradient(circle at 50% 0, rgba(120, 120, 120, 0.18) 0, rgba(120, 120, 120, 0) 62%);
	}

	.theme-dark .wrap::after {
		background: radial-gradient(circle at 50% 100%, rgba(90, 90, 90, 0.16) 0, rgba(90, 90, 90, 0) 68%);
	}

	.theme-dark .logo-core,
	.theme-dark .card {
		background: rgba(24, 27, 33, 0.96);
		box-shadow: none;
	}

	.theme-dark .welcome {
		color: #e5e7eb;
	}

	.theme-dark .title,
	.theme-dark .label,
	.theme-dark .input,
	.theme-dark .copyright {
		color: #f3f4f6;
	}

	.theme-dark .subtitle,
	.theme-dark .safety-text {
		color: #9ca3af;
	}

	.theme-dark .input-wrap {
		border-color: #2a2f37;
		background: #111318;
	}

	.theme-dark .input-placeholder {
		color: #6b7280;
	}

	.theme-dark .submit-btn {
		background: linear-gradient(135deg, #2b2f36 0%, #16181d 100%);
		box-shadow: none;
	}
</style>