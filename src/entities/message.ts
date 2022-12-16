/**
 * 统一定义 message 格式
 */

/**
 * 创建 Message
 */
export function createMessage(type: string, data: unknown) {
    return JSON.stringify({
        type,
        data
    });
}

/**
 * 解析 Message
 */
export function parseMessage(message: string) {
    return JSON.parse(message) as {type: string; data: unknown};
}
