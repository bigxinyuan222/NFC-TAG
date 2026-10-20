<template>
	<view class="wrap" :class="skinClass">
		<view class="bg-orb bg-orb-left"></view>
		<view class="bg-orb bg-orb-right"></view>

		<view class="scroll">
			<view class="top-glow"></view>

			<view class="profile-head">
				<view class="avatar-shell" :class="avatarFrameClass" @tap="previewAvatar" @longpress="openFramePicker">
					<image class="avatar-image" :src="avatarLoadFailed || !avatarUrl ? '/static/icons/avatar-default.svg' : avatarUrl" mode="aspectFill" @error="handleAvatarError" />
					<image v-if="avatarFrameOverlay" class="avatar-frame-overlay" :src="avatarFrameOverlay" mode="aspectFit" />
				</view>
				<text class="profile-name">{{ userName }}</text>
				<text class="profile-meta">{{ department }}</text>
			</view>

			<view class="menu-card">
				<view v-for="item in menuItems" :key="item.key" class="menu-row" @tap="handleMenu(item)">
					<view class="menu-left">
						<view class="menu-chip" :style="{ backgroundColor: item.tint }">
							<image class="menu-icon" :src="item.icon" mode="aspectFit" />
						</view>
						<text class="menu-label">{{ item.label }}</text>
					</view>
					<image class="menu-arrow-icon" src="/static/icons/menu-chevron-right.svg" mode="aspectFit" />
				</view>
			</view>

			<view class="logout-card" @tap="openLogoutModal">
				<text class="logout-text">退出登录</text>
			</view>

			<image class="cheer-banner" src="/static/cat-cheer.png" mode="widthFix" />

		</view>

		<view v-if="framePickerVisible" class="frame-mask" @tap="closeFramePicker"></view>
		<view class="frame-panel" :class="{ 'frame-panel--show': framePickerVisible }">
			<text class="frame-panel-title">选择头像框</text>
			<view class="frame-options">
				<view v-for="item in avatarFrames" :key="item.id" class="frame-option" @tap="selectFrame(item.id)">
					<view class="frame-preview-wrap" :class="{ 'frame-preview-wrap--active': avatarFrameId === item.id }">
						<view class="frame-preview avatar" :class="item.className">
							<image class="frame-preview-image" :src="avatarLoadFailed || !avatarUrl ? '/static/icons/avatar-default.svg' : avatarUrl" mode="aspectFill" />
							<image v-if="item.overlay" class="avatar-frame-overlay" :src="item.overlay" mode="aspectFit" />
						</view>
					</view>
					<text class="frame-option-name" :class="{ 'frame-option-name--active': avatarFrameId === item.id }">{{ item.name }}</text>
				</view>
			</view>
		</view>

		<view v-if="showLogoutModal" class="logout-modal-mask" @tap="closeLogoutModal">
			<view class="logout-modal-card" @tap.stop>
				<text class="logout-modal-title">提示</text>
				<text class="logout-modal-message">确定要退出登录吗？</text>
				<view class="logout-modal-actions">
					<view class="logout-modal-btn logout-modal-btn-cancel" @tap="closeLogoutModal">
						<text class="logout-modal-btn-cancel-text">取消</text>
					</view>
					<view class="logout-modal-btn logout-modal-btn-confirm" @tap="confirmLogout">
						<text class="logout-modal-btn-confirm-text">退出</text>
					</view>
				</view>
			</view>
		</view>

		<app-tabbar current="profile" :skin="skinClass" />
	</view>
</template>

<script>
	import AppTabbar from '@/components/app-tabbar/index.vue'
	import { clearSession, getSession } from '@/utils/session'
	import { AVATAR_FRAMES, getAvatarFrame, getAvatarFrameId, setAvatarFrameId } from '@/utils/avatar-frame'
	import { getSkinClass } from '@/utils/skin'

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
				avatarFrameId: 'default',
				avatarFrameEntry: AVATAR_FRAMES[0],
				avatarFrames: AVATAR_FRAMES,
				framePickerVisible: false,
				showLogoutModal: false,
				skinClass: 'skin-sunny',
				menuItems: [
					{ key: 'profile', label: '个人信息', icon: '/static/icons/menu-user.svg', tint: 'rgba(245, 154, 35, 0.14)' },
					{ key: 'security', label: '账号与安全', icon: '/static/icons/menu-shield.svg', tint: 'rgba(95, 169, 122, 0.16)' },
					{ key: 'setting', label: '系统设置', icon: '/static/icons/menu-settings.svg', tint: 'rgba(107, 143, 216, 0.16)' },
					{ key: 'about', label: '关于我们', icon: '/static/icons/menu-about.svg', tint: 'rgba(176, 124, 212, 0.16)' }
				]
			}
		},
		computed: {
			avatarFrameClass() {
				return this.avatarFrameEntry.className
			},
			avatarFrameOverlay() {
				return this.avatarFrameEntry.overlay
			}
		},
		onShow() {
			this.skinClass = getSkinClass()
			const session = getSession()
			const { userName, department, avatarUrl } = session
			this.userName = userName
			this.department = department
			this.avatarUrl = avatarUrl
			this.avatarLoadFailed = false
			this.avatarFrameId = getAvatarFrameId(session)
			this.avatarFrameEntry = getAvatarFrame(session)

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

				uni.showToast({
					title: '暂未开放',
					icon: 'none'
				})
			},
			openLogoutModal() {
				this.showLogoutModal = true
			},
			closeLogoutModal() {
				this.showLogoutModal = false
			},
			confirmLogout() {
				this.showLogoutModal = false
				clearSession()
				this.goLogin()
			},
			previewAvatar() {
				if (this.avatarLoadFailed || !this.avatarUrl) return
				uni.previewImage({
					urls: [this.avatarUrl]
				})
			},
			handleAvatarError() {
				this.avatarLoadFailed = true
			},
			openFramePicker() {
				this.framePickerVisible = true
			},
			closeFramePicker() {
				this.framePickerVisible = false
			},
			selectFrame(frameId) {
				setAvatarFrameId(getSession(), frameId)
				this.avatarFrameId = frameId
				this.avatarFrameEntry = getAvatarFrame(getSession())
				this.framePickerVisible = false
			}
		}
	}
</script>

<style>
	page {
		background: var(--sk-page-bg);
	}

	.wrap {
		position: relative;
		height: 100vh;
		height: 100dvh;
		background: linear-gradient(180deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 60%, var(--sk-bg-3) 100%);
		overflow: hidden;
	}

	.bg-orb {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		background: radial-gradient(circle, var(--sk-orb-1) 0%, var(--sk-orb-2) 42%, var(--sk-orb-3) 74%);
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
		padding: 36rpx 32rpx calc(170rpx + env(safe-area-inset-bottom));
	}

	.top-glow {
		height: 144rpx;
		border-radius: 0 0 150rpx 150rpx;
		background: radial-gradient(circle at 50% 0, var(--sk-glow-1) 0, var(--sk-glow-2) 34%, var(--sk-glow-3) 56%, var(--sk-glow-4) 76%);
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
		background: var(--sk-card-3);
		box-shadow: 0 18rpx 42rpx var(--sk-shadow-lg);
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.profile-name {
		display: block;
		margin-top: 24rpx;
		color: var(--sk-text);
		font-size: 46rpx;
		font-weight: 600;
		line-height: 1.25;
	}

	.profile-meta {
		display: block;
		margin-top: 14rpx;
		color: var(--sk-text-muted);
		font-size: 24rpx;
		line-height: 1.4;
	}

	.menu-card,
	.logout-card {
		background: rgba(255, 255, 255, 0.98);
		border-radius: 32rpx;
		box-shadow: 0 12rpx 34rpx var(--sk-shadow);
	}

	.menu-card {
		margin-top: 40rpx;
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
		border-top: 1rpx solid var(--sk-border);
	}

	.menu-left {
		gap: 24rpx;
	}

	.menu-chip {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76rpx;
		height: 76rpx;
		border-radius: 24rpx;
		flex-shrink: 0;
	}

	.menu-icon {
		width: 40rpx;
		height: 40rpx;
	}

	.menu-label {
		color: var(--sk-text);
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
		margin-top: 24rpx;
		height: 100rpx;
	}

	.logout-text {
		color: #E0685F;
		font-size: 30rpx;
		font-weight: 600;
	}

	.cheer-banner {
		position: absolute;
		left: 0;
		right: 0;
		width: 100%;
		bottom: calc(108rpx + env(safe-area-inset-bottom));
	}

	.frame-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 90;
		background: rgba(0, 0, 0, 0.35);
	}

	.frame-panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 91;
		padding: 36rpx 28rpx calc(44rpx + env(safe-area-inset-bottom));
		background: #FFFFFF;
		border-radius: 36rpx 36rpx 0 0;
		box-shadow: 0 -12rpx 30rpx var(--sk-shadow-sm);
		transform: translateY(100%);
		opacity: 0;
		transition: transform 0.28s ease, opacity 0.28s ease;
	}

	.frame-panel--show {
		transform: translateY(0);
		opacity: 1;
	}

	.frame-panel-title {
		display: block;
		text-align: center;
		color: var(--sk-text);
		font-size: 32rpx;
		font-weight: 700;
	}

	.frame-options {
		display: flex;
		justify-content: space-between;
		margin-top: 36rpx;
	}

	.frame-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
	}

	.frame-preview-wrap {
		padding: 14rpx;
		border-radius: 50%;
		box-shadow: 0 0 0 2rpx transparent;
		transition: box-shadow 0.2s ease;
	}

	.frame-preview-wrap--active {
		box-shadow: 0 0 0 2rpx var(--sk-accent);
	}

	.frame-preview {
		width: 92rpx;
		height: 92rpx;
		border-radius: 50%;
		background: var(--sk-bg-1);
		overflow: hidden;
		box-sizing: border-box;
	}

	.frame-preview-image {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.frame-option-name {
		margin-top: 14rpx;
		color: var(--sk-text-muted);
		font-size: 24rpx;
	}

	.frame-option-name--active {
		color: var(--sk-accent);
		font-weight: 600;
	}

	.logout-modal-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		background: rgba(30, 22, 12, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logout-modal-card {
		width: 600rpx;
		max-width: 88vw;
		padding: 40rpx 32rpx 32rpx;
		box-sizing: border-box;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 18rpx 50rpx rgba(60, 40, 15, 0.18);
		text-align: center;
	}

	.logout-modal-title {
		display: block;
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
	}

	.logout-modal-message {
		display: block;
		margin-top: 22rpx;
		color: #7A6650;
		font-size: 28rpx;
		line-height: 1.6;
	}

	.logout-modal-actions {
		display: flex;
		gap: 20rpx;
		margin-top: 36rpx;
	}

	.logout-modal-btn {
		flex: 1;
		height: 84rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logout-modal-btn-cancel {
		background: #F5EBDC;
	}

	.logout-modal-btn-cancel-text {
		color: #7A6650;
		font-size: 28rpx;
		font-weight: 600;
	}

	.logout-modal-btn-confirm {
		background: linear-gradient(135deg, #FFB84D 0%, #F59A23 100%);
	}

	.logout-modal-btn-confirm-text {
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

</style>
