import { serve } from '@hono/node-server'
import { deepSeek } from '@ai-sdk/deepseek'
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  tool,
  validateUIMessages,
} from 'ai'
import { Hono } from 'hono'
import { z } from 'zod'

if (!process.env.DEEPSEEK_API_KEY?.trim()) {
  throw new Error('请在工程根目录的 .env 中设置 DEEPSEEK_API_KEY')
}

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/chat', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: 'messages 必须是非空数组' }, 400)
  }

  let messages
  try {
    messages = await validateUIMessages({ messages: body.messages })
  } catch {
    return c.json({ error: '消息格式不正确' }, 400)
  }

  if (messages.some((message) => message.role === 'system')) {
    return c.json({ error: '客户端不能设置系统提示' }, 400)
  }

  const result = streamText({
    model: deepSeek('deepseek-v4-pro'),
    instructions: '使用简洁、准确的中文回答。',
    messages: await convertToModelMessages(messages),
    tools: {
      getWeather: tool({
        description: '返回指定城市的模拟天气，用于演示，不能作为实时天气依据',
        inputSchema: z.object({
          city: z.string().describe('中文城市名，例如北京'),
        }),
        execute: async ({ city }) => ({
          city,
          temperature: 25,
          condition: '晴',
          source: '模拟数据',
        }),
      }),
    },
    stopWhen: isStepCount(3),
    maxOutputTokens: 1024,
    maxRetries: 0,
    timeout: 60_000,
    onError: ({ error }) => {
      console.error('模型请求失败：', error)
    },
  })

  return result.toUIMessageStreamResponse({
    onError: () => '生成失败，请检查后端终端中的错误信息后重试。',
  })
})

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 3001 }, (info) => {
  console.log(`AI server: http://127.0.0.1:${info.port}`)
})
