import { BASE_URL } from '@/utils/config'
import { getToken } from '@/utils/session'

/**
 * 根据当前登录 token 查询本人绑定的钉钉 userid 前 6 位
 * 后端从 JWT 解析身份，不接受 userId 参数，只能查自己
 */
export function getDingtalkUserIdPrefix() {
	const token = getToken()
	if (!token) {
		return Promise.reject(new Error('登录状态已失效，请重新登录'))
	}

	return new Promise((resolve, reject) => {
		uni.request({
			url: BASE_URL + '/api/dingtalk-userid-prefix',
			method: 'GET',
			header: {
				Authorization: 'Bearer ' + token
			},
			success: (response) => {
				const body = response.data && typeof response.data === 'object' ? response.data : {}
				if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 0) {
					const prefix = body.data && body.data.dingtalkUserIdPrefix ? String(body.data.dingtalkUserIdPrefix) : ''
					if (prefix) {
						resolve(prefix)
					} else {
						reject(new Error('接口未返回钉钉用户标识'))
					}
				} else {
					const message = body.msg || body.message || '获取用户标识失败'
					reject(new Error(message))
				}
			},
			fail: (err) => {
				reject(new Error(err && err.errMsg ? err.errMsg : '网络请求失败'))
			}
		})
	})
}
