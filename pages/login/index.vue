<template>
	<view class="wrap">
		<view class="main-shell">
			<view class="hero">
				<image class="hero-img" src="/static/illustration/login-hero.png" mode="widthFix" />
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

				<view v-if="!isLoginMode" class="field">
					<text class="label">部门</text>
					<picker
						class="department-picker"
						mode="selector"
						:range="departmentOptions"
						:value="departmentIndex"
						@change="handleDepartmentChange"
					>
						<view class="input-wrap picker-wrap">
							<image class="input-icon" src="/static/icons/building.svg" mode="aspectFit" />
							<text class="input department-value" :class="{ 'input-placeholder': !form.department }">{{ form.department || '请选择部门' }}</text>
							<image class="picker-arrow" src="/static/icons/chevron-right.svg" mode="aspectFit" />
						</view>
					</picker>
				</view>

				<view v-if="!isLoginMode" class="field">
					<text class="label">手机号</text>
					<view class="input-wrap">
						<image class="input-icon" src="/static/icons/phone.svg" mode="aspectFit" />
						<input class="input" type="number" maxlength="11" :value="form.phone" @input="handlePhoneInput" placeholder="请输入手机号" placeholder-class="input-placeholder" />
					</view>
				</view>

				<view class="submit-btn" @tap.stop="handleSubmit">{{ isLoginMode ? '登录' : '注册' }}</view>
				<view class="switch-login" @tap.stop="handleSwitchMode">
					<text class="switch-tip">{{ isLoginMode ? '还没有账号？' : '已有账号？' }}</text>
					<text class="switch-link">{{ isLoginMode ? '点击去注册' : '点击去登录' }}</text>
				</view>

				<!-- 钉钉登录待配置安装后启用 -->
				<view v-if="isLoginMode" class="divider">
					<view class="divider-line"></view>
					<text class="divider-text">其他登录方式</text>
					<view class="divider-line"></view>
				</view>
				<view v-if="isLoginMode" class="ding-btn" @tap.stop="dingLogin">
					<text class="ding-badge">钉</text>
					<text class="ding-text">钉钉一键登录</text>
				</view>
				</view>
		</view>

		<view class="safety">
			<image class="safety-icon" src="/static/icons/shield.svg" mode="aspectFit" />
			<text class="safety-text">数据安全保障中</text>
		</view>

		<text class="copyright">© 2026 喵呜打卡</text>

	</view>
</template>

<script>
	import { getSession, hasSession, saveSession } from '@/utils/session'
	import { registerAccount, loginAccount, loginByDingTalk } from '@/api/auth'
	import { getDingtalkUserIdPrefix } from '@/api/user'
	import { DEPARTMENT_OPTIONS, DINGTALK_APP_KEY, DINGTALK_REDIRECT_URL } from '@/utils/config'
	import { authLogin } from '@/uni_modules/open-dinglogin'

	export default {
		data() {
			return {
				form: {
					userName: '',
					department: '',
					phone: '',
					password: ''
				},
				departmentOptions: DEPARTMENT_OPTIONS,
				departmentIndex: 0,
				isLoginMode: true,
				isSubmitting: false
			}
		},
		onShow() {
			if (hasSession()) {
				this.goCheckin()
				return
			}

			const { userName, department } = getSession()
			this.form.userName = userName
			const departmentIndex = this.departmentOptions.indexOf(department)
			this.departmentIndex = departmentIndex >= 0 ? departmentIndex : 0
			this.form.department = departmentIndex >= 0 ? department : ''
		},
		methods: {
			handleSubmit() {
				if (this.isLoginMode) {
					this.login()
					return
				}
				this.register()
			},
			handleSwitchMode() {
				if (this.isLoginMode) {
					this.switchToRegister()
					return
				}
				this.switchToLogin()
			},
			handleNameInput(event) {
				this.form.userName = event.detail.value
			},
			handleDepartmentChange(event) {
				const index = Number(event.detail.value)
				this.departmentIndex = index
				this.form.department = this.departmentOptions[index] || ''
			},
			goCheckin() {
				uni.reLaunch({
					url: '/pages/checkin/index',
					fail: (error) => {
						console.error('[页面跳转失败]', {
							url: '/pages/checkin/index',
							error
						})
						uni.showToast({
							title: '页面未加载，请重新编译小程序',
							icon: 'none',
							duration: 2500
						})
					}
				})
			},
			handlePasswordInput(event) {
				this.form.password = event.detail.value
			},
			handlePhoneInput(event) {
				this.form.phone = event.detail.value
			},
			switchToLogin() {
				this.form.password = ''
				this.isLoginMode = true
			},
			switchToRegister() {
				this.form.password = ''
				this.isLoginMode = false
			},
			async register() {
				if (this.isSubmitting) {
					return
				}

				uni.hideKeyboard()

				const userName = (this.form.userName || '').trim()
				const department = (this.form.department || '').trim()
				const phone = (this.form.phone || '').trim()
				const password = (this.form.password || '').trim()

				if (!userName || !department || !phone || !password) {
					uni.showToast({
						title: '请填写完整信息',
						icon: 'none'
					})
					return
				}
				if (userName.length > 64 || department.length > 64 || password.length > 128) {
					uni.showToast({
						title: '姓名和部门最多64个字符，密码最多128个字符',
						icon: 'none'
					})
					return
				}
				if (!/^1\d{10}$/.test(phone)) {
					uni.showToast({
						title: '请输入正确的手机号',
						icon: 'none'
					})
					return
				}

				this.isSubmitting = true
				try {
					const result = await registerAccount({ userName, department, phone, password })
					console.log('[注册成功]', {
						userName,
						department,
						phone,
						response: result
					})
					this.saveUserSession(result)
					uni.showToast({ title: '注册成功', icon: 'success' })
					this.goCheckin()
				} catch (error) {
					console.error('[注册失败]', {
						userName,
						department,
						error
					})
					this.showRequestError(error)
				} finally {
					this.isSubmitting = false
				}
			},
			async login() {
				if (this.isSubmitting) {
					return
				}

				uni.hideKeyboard()

				const userName = (this.form.userName || '').trim()
				const password = (this.form.password || '').trim()

				if (!userName || !password) {
					uni.showToast({
						title: '请输入姓名和密码',
						icon: 'none'
					})
					return
				}
				if (userName.length > 64 || password.length > 128) {
					uni.showToast({
						title: '姓名最多64个字符，密码最多128个字符',
						icon: 'none'
					})
					return
				}

				this.isSubmitting = true
				try {
					const result = await loginAccount({ userName, password })
					console.log('[登录成功]', {
						userName,
						response: result
					})
					this.saveUserSession(result)
					await this.fetchUserPrefix()
					this.goCheckin()
				} catch (error) {
					console.error('[登录失败]', {
						userName,
						error
					})
					this.showRequestError(error)
				} finally {
					this.isSubmitting = false
				}
			},
			saveUserSession(result) {
				const payload = result && result.data ? result.data : result
				const user = payload && payload.user ? payload.user : payload
				const token = payload && (payload.token || payload.accessToken)

				if (!token || !user || !user.userName || !user.department) {
					throw new Error('认证接口返回数据格式不正确')
				}

				saveSession({
					userName: user.userName,
					department: user.department,
					avatarUrl: user.avatarUrl || '',
					token
				})
			},
			// 拉取当前用户的钉钉 userid 前 6 位，用于专属头像框白名单判断
			// 失败不阻断登录，仅控制台记录，专属框会对所有人隐藏
			async fetchUserPrefix() {
				try {
					const prefix = await getDingtalkUserIdPrefix()
					saveSession({ dingtalkUserIdPrefix: prefix })
					console.log('[用户标识]', prefix)
				} catch (error) {
					console.warn('[获取用户标识失败，专属头像框将不可用]', error)
				}
			},
			showRequestError(error) {
				uni.showToast({
					title: error && error.message ? error.message : '网络请求失败',
					icon: 'none'
				})
			},
			async dingLogin() {
				if (this.isSubmitting) return
				uni.hideKeyboard()
				this.isSubmitting = true
				uni.showLoading({ title: '正在唤起钉钉...', mask: true })
				try {
					const auth = await authLogin({
						appId: DINGTALK_APP_KEY,
						redirectUrl: DINGTALK_REDIRECT_URL,
						responseType: 'code',
						scope: 'openid',
						prompt: 'consent',
						state: Date.now() + ''
					})
					if (!auth.authCode) {
						uni.hideLoading()
						uni.showToast({ title: auth.errMsg || '钉钉授权失败', icon: 'none' })
						return
					}
					uni.showLoading({ title: '正在登录...', mask: true })
					const result = await loginByDingTalk(auth.authCode)
					uni.hideLoading()
					this.saveUserSession(result)
					uni.showToast({ title: '登录成功', icon: 'success' })
					this.goCheckin()
				} catch (error) {
					uni.hideLoading()
					console.error('[钉钉登录失败]', error)
					this.showRequestError(error)
				} finally {
					this.isSubmitting = false
				}
			}
		}
	}
</script>

<style>
	page {
		background: #FDF6E9;
	}

	.wrap {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		padding: calc(var(--status-bar-height) + 12rpx) 28rpx 24rpx;
		overflow: hidden;
		background: linear-gradient(180deg, #FFF9EF 0%, #FDF3E4 60%, #FBEDD9 100%);
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
		padding-bottom: 56rpx;
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
		background: radial-gradient(circle at 50% 0, rgba(255, 199, 130, 0.50) 0, rgba(255, 199, 130, 0) 62%);
	}

	.wrap::after {
		bottom: -80rpx;
		height: 280rpx;
		background: radial-gradient(circle at 50% 100%, rgba(255, 214, 160, 0.42) 0, rgba(255, 214, 160, 0) 68%);
	}

	.hero {
		position: relative;
		margin-top: 36rpx;
		flex-shrink: 0;
		text-align: center;
	}

	.hero-img {
		display: block;
		width: 400rpx;
		margin: 0 auto;
	}

	.card {
		position: relative;
		margin-top: 56rpx;
		padding: 34rpx 32rpx 30rpx;
		margin-left: 18rpx;
		margin-right: 18rpx;
		border-radius: 36rpx;
		background: rgba(255, 255, 255, 0.96);
		box-shadow: 0 20rpx 60rpx rgba(212, 162, 94, 0.16);
		flex-shrink: 0;
	}

	.field + .field {
		margin-top: 36rpx;
	}

	.label {
		display: block;
		margin-bottom: 12rpx;
		color: #3D3226;
		font-size: 26rpx;
		font-weight: 600;
	}

	.input-wrap {
		display: flex;
		align-items: center;
		height: 88rpx;
		padding: 0 20rpx;
		border: 1rpx solid #F0E3CE;
		border-radius: 22rpx;
		background: #fffaf2;
	}

	.department-picker {
		display: block;
		width: 100%;
	}

	.picker-wrap {
		width: 100%;
		box-sizing: border-box;
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
		color: #3D3226;
		font-size: 26rpx;
	}

	.department-value {
		display: flex;
		align-items: center;
	}

	.input-placeholder {
		color: #B9A88F;
		font-size: 26rpx;
	}

	.picker-arrow {
		flex-shrink: 0;
		width: 30rpx;
		height: 30rpx;
		opacity: 0.55;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 44rpx;
		height: 84rpx;
		border-radius: 42rpx;
		background: linear-gradient(135deg, #FFB84D 0%, #F59A23 100%);
		box-shadow: 0 18rpx 36rpx rgba(245, 154, 35, 0.28);
		color: #ffffff;
		font-size: 30rpx;
		font-weight: 600;
	}

	.switch-login {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 22rpx;
		font-size: 24rpx;
	}

	.switch-tip {
		color: #A08C77;
	}

	.switch-link {
		margin-left: 8rpx;
		color: #F59A23;
		font-weight: 600;
	}

	.divider {
		display: flex;
		align-items: center;
		margin-top: 34rpx;
	}

	.divider-line {
		flex: 1;
		height: 1rpx;
		background: #EDE0CC;
	}

	.divider-text {
		padding: 0 20rpx;
		color: #B9A88F;
		font-size: 22rpx;
	}

	.ding-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 26rpx;
		height: 84rpx;
		border-radius: 42rpx;
		background: #EEF4FF;
		border: 1rpx solid #C9DCFF;
	}

	.ding-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40rpx;
		height: 40rpx;
		margin-right: 14rpx;
		border-radius: 10rpx;
		background: #1677FF;
		color: #ffffff;
		font-size: 26rpx;
		font-weight: 600;
	}

	.ding-text {
		color: #1677FF;
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
		color: #A08C77;
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
		color: #B9A88F;
		font-size: 22rpx;
		text-align: center;
	}

</style>
