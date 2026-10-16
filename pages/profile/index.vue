<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="bg-orb bg-orb-left"></view>
		<view class="bg-orb bg-orb-right"></view>

		<scroll-view class="scroll" scroll-y>
			<view class="top-glow"></view>

			<view class="profile-head">
				<view class="avatar-shell">
					<image class="avatar-image" :src="avatarLoadFailed || !avatarUrl ? '/static/icons/avatar-default.svg' : avatarUrl" mode="aspectFill" @error="handleAvatarError" />
				</view>
				<text class="profile-name">{{ userName }}</text>
				<text class="profile-meta">{{ department }}</text>
			</view>

			<view class="menu-card">
				<view v-for="item in menuItems" :key="item.key" class="menu-row" @tap="handleMenu(item)">
					<view class="menu-left">
						<image class="menu-icon" :src="item.icon" mode="aspectFit" />
						<text class="menu-label">{{ item.label }}</text>
					</view>
					<image class="menu-arrow-icon" src="/static/icons/menu-chevron-right.svg" mode="aspectFit" />
				</view>
			</view>

			<view class="logout-card" @tap="handleLogout">
				<text class="logout-text">退出登录</text>
			</view>

		</scroll-view>

		<app-tabbar current="profile" :theme="currentTheme" />
	</view>
</template>

<script>
	import AppTabbar from '@/components/app-tabbar/index.vue'
	import { clearSession, getSession } from '@/utils/session'
	import { getTheme } from '@/utils/theme'

	export default {
		components: {
			AppTabbar
		},
		data() {
			return {
				userName: '',
				department: '',
				avatarUrl: '',
				avatarLoadFailed: false,
				currentTheme: 'light',
				menuItems: [
					{ key: 'profile', label: '个人信息', icon: '/static/icons/user.svg' },
					{ key: 'security', label: '账号与安全', icon: '/static/icons/shield.svg' },
					{ key: 'setting', label: '系统设置', icon: '/static/icons/settings.svg' },
					{ key: 'help', label: '帮助与反馈', icon: '/static/icons/help.svg' },
					{ key: 'about', label: '关于我们', icon: '/static/icons/info.svg' }
				]
			}
		},
		onShow() {
			const { userName, department, avatarUrl } = getSession()
			this.userName = userName
			this.department = department
				this.avatarUrl = avatarUrl
				this.avatarLoadFailed = false
			this.currentTheme = getTheme()

			if (!this.userName || !this.department) {
				clearSession()
				this.goLogin()
				return
			}
		},
		methods: {
			goLogin() {
				uni.reLaunch({
					url: '/pages/login/index'
				})
			},
			handleMenu(item) {
				if (item.key === 'profile') {
					uni.navigateTo({
						url: '/pages/profile-edit/index'
					})
					return
				}

				if (item.key === 'setting') {
					uni.navigateTo({
						url: '/pages/settings/index'
					})
					return
				}

				if (item.key === 'about') {
					uni.navigateTo({
						url: '/pages/about/index'
					})
					return
				}

				if (item.key === 'help') {
					uni.navigateTo({
						url: '/pages/help/index'
					})
					return
				}

				uni.showToast({
					title: '暂未开放',
					icon: 'none'
				})
			},
			handleLogout() {
				uni.showModal({
					title: '提示',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							clearSession()
							this.goLogin()
						}
					}
				})
			},
				handleAvatarError() {
					this.avatarLoadFailed = true
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
		height: 100vh;
		height: 100dvh;
		background: linear-gradient(180deg, #FFF9EF 0%, #FDF3E4 60%, #FBEDD9 100%);
		overflow: hidden;
	}

	.bg-orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		background: radial-gradient(circle, rgba(255, 184, 77, 0.16) 0%, rgba(255, 184, 77, 0.07) 42%, rgba(255, 184, 77, 0) 74%);
	}

	.bg-orb-left {
		left: -120rpx;
		top: -20rpx;
		width: 360rpx;
		height: 360rpx;
	}

	.bg-orb-right {
		right: -110rpx;
		top: 72rpx;
		width: 320rpx;
		height: 320rpx;
	}

	.scroll {
		position: relative;
		z-index: 1;
		height: 100%;
		box-sizing: border-box;
		padding: 42rpx 32rpx 170rpx;
	}

	.top-glow {
		height: 176rpx;
		border-radius: 0 0 150rpx 150rpx;
		background: radial-gradient(circle at 50% 0, rgba(255, 199, 130, 0.30) 0, rgba(255, 199, 130, 0.12) 34%, rgba(255, 199, 130, 0.04) 56%, rgba(255, 199, 130, 0) 76%);
	}

	.profile-head {
		margin-top: -6rpx;
		padding-top: 18rpx;
		text-align: center;
	}

	.avatar-shell {
		width: 144rpx;
		height: 144rpx;
		margin: 0 auto;
		padding: 8rpx;
		box-sizing: border-box;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.84);
		box-shadow: 0 18rpx 42rpx rgba(212, 162, 94, 0.18);
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.profile-name {
		display: block;
		margin-top: 28rpx;
		color: #3D3226;
		font-size: 46rpx;
		font-weight: 600;
		line-height: 1.25;
	}

	.profile-meta {
		display: block;
		margin-top: 14rpx;
		color: #A08C77;
		font-size: 24rpx;
		line-height: 1.4;
	}

	.menu-card,
	.logout-card {
		background: rgba(255, 255, 255, 0.98);
		border-radius: 32rpx;
		box-shadow: 0 12rpx 34rpx rgba(212, 162, 94, 0.12);
	}

	.menu-card {
		margin-top: 50rpx;
		overflow: hidden;
	}

	.menu-row,
	.menu-left,
	.logout-card {
		display: flex;
		align-items: center;
	}

	.menu-row {
		justify-content: space-between;
		height: 112rpx;
		padding: 0 32rpx;
		box-sizing: border-box;
	}

	.menu-row + .menu-row {
		border-top: 1rpx solid rgba(242, 231, 213, 0.92);
	}

	.menu-left {
		gap: 28rpx;
	}

	.menu-icon {
		width: 42rpx;
		height: 42rpx;
		flex-shrink: 0;
	}

	.menu-label {
		color: #3D3226;
		font-size: 28rpx;
		font-weight: 600;
	}

	.menu-arrow-icon {
		width: 34rpx;
		height: 34rpx;
		flex-shrink: 0;
	}

	.logout-card {
		justify-content: center;
		margin-top: 36rpx;
		height: 100rpx;
	}

	.logout-text {
		color: #E0685F;
		font-size: 30rpx;
		font-weight: 600;
	}

	.theme-dark {
		background: linear-gradient(180deg, #211A14 0%, #2A211A 55%, #211A14 100%);
	}

	.theme-dark .bg-orb {
		background: radial-gradient(circle, rgba(245, 166, 35, 0.10) 0%, rgba(245, 166, 35, 0.04) 42%, rgba(245, 166, 35, 0) 74%);
	}

	.theme-dark .top-glow {
		background: radial-gradient(circle at 50% 0, rgba(245, 166, 35, 0.16) 0, rgba(245, 166, 35, 0.07) 34%, rgba(245, 166, 35, 0.03) 56%, rgba(245, 166, 35, 0) 76%);
	}

	.theme-dark .profile-name,
	.theme-dark .menu-label {
		color: #F5E9D9;
	}

	.theme-dark .profile-meta {
		color: #B09A83;
	}

	.theme-dark .menu-card,
	.theme-dark .logout-card,
	.theme-dark .avatar-shell {
		background: rgba(48, 39, 31, 0.96);
		box-shadow: none;
	}

	.theme-dark .menu-row + .menu-row {
		border-top-color: rgba(74, 61, 48, 0.9);
	}
</style>
