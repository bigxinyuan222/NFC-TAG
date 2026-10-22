/**
 * 猫咪素材映射配置（语义名 → 真实文件路径 + 动画类型）
 *
 * 原则：
 * 1. 猫咪 PNG 保留原始色彩，不随主题染色；主题色由 utils/skin.js 与 --sk-* 变量控制。
 * 2. 动画类型仅描述建议的呈现方式，实际动画由各页面的 CSS 实现。
 *    - none      静态展示
 *    - float     轻微上下浮动（主页主视觉）
 *    - breathe   极轻微呼吸缩放（睡觉猫咪）
 *    - pop       事件触发的弹出（打卡成功反馈）
 *    - zfloat    上浮并淡出（睡觉 Z 特效）
 *    - twinkle   透明度/缩放轻微变化（闪光特效）
 * 3. 含烘焙主题色的 PNG（如自带紫色 NFC 圆球）会锁死主题切换，
 *    主页主视觉因此保留「cat-hug 单张完整图 + CSS 主题色圆圈」方案。
 */

const SPRITE = '/static/sprites'

const catAssets = {
	// —— 主页主视觉 ——
	checkin: {
		src: SPRITE + '/cat-hug.png',
		animation: 'float'
	},

	// —— 头像 ——
	avatar: {
		src: SPRITE + '/cat_avatar_happy.png',
		animation: 'none'
	},

	// —— 睡觉 / 空闲 ——
	sleeping: {
		src: SPRITE + '/cat_sleeping.png',
		animation: 'breathe'
	},
	sleepingCushion: {
		src: SPRITE + '/cat_sleeping_cushion.png',
		animation: 'breathe'
	},
	// 个人中心底部完整插画（趴卧猫咪 + 「继续加油」文字 + 爱心 + 绿植 + 地面）
	come: {
		src: SPRITE + '/cat_come.png',
		animation: 'none'
	},
	// cat_come.png 的同一张插画，仅裁掉上下纯透明边缘（462x462 -> 458x173），原图保留
	comeBanner: {
		src: SPRITE + '/cat_come_banner.png',
		animation: 'none'
	},
	sleepZ: {
		src: SPRITE + '/effect_sleep_z.png',
		animation: 'zfloat'
	},

	// —— 状态反馈 ——
	cheer: {
		src: SPRITE + '/cat_cheer.png',
		animation: 'pop'
	},
	loveCheer: {
		src: SPRITE + '/cat_love_cheer.png',
		animation: 'pop'
	},
	excited: {
		src: SPRITE + '/cat_excited.png',
		animation: 'pop'
	},
	peaceful: {
		src: SPRITE + '/cat_peaceful.png',
		animation: 'none'
	},

	// —— 欢迎 / 装饰 ——
	wave: {
		src: SPRITE + '/cat_wave.png',
		animation: 'none'
	},
	love: {
		src: SPRITE + '/cat_love.png',
		animation: 'none'
	},
	curious: {
		src: SPRITE + '/cat_curious.png',
		animation: 'none'
	},
	peek: {
		src: SPRITE + '/cat_peek.png',
		animation: 'none'
	},
	backView: {
		src: SPRITE + '/cat_back_view.png',
		animation: 'none'
	},
	playYarn: {
		src: SPRITE + '/cat_play_yarn.png',
		animation: 'none'
	},
	lyingPaw: {
		src: SPRITE + '/cat_lying_paw.png',
		animation: 'none'
	},

	// —— 装饰特效 ——
	sparkle: {
		src: SPRITE + '/effect_sparkle.png',
		animation: 'twinkle'
	},
	plant: {
		src: SPRITE + '/effect_plant.png',
		animation: 'none'
	}
}

export default catAssets
