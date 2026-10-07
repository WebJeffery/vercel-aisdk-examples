import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, type FormEvent } from 'react'

const transport = new DefaultChatTransport({ api: '/api/chat' })

export default function App() {
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport,
  })
  const [input, setInput] = useState('')
  const busy = status === 'submitted' || status === 'streaming'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    void sendMessage({ text })
    setInput('')
  }

  return (
    <main>
      <h1>AI 聊天 Demo</h1>
      <section className="messages" aria-label="对话消息" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id}>
            <strong>{message.role === 'user' ? '你' : 'AI'}</strong>
            {message.parts.map((part, index) => {
              if (part.type === 'text') return <p key={index}>{part.text}</p>
              if (part.type === 'tool-getWeather') {
                return (
                  <div key={part.toolCallId}>
                    <p role="status">
                      模拟天气工具：
                      {part.state === 'output-available'
                        ? '已完成'
                        : part.state === 'output-error'
                          ? '执行失败'
                          : part.state === 'output-denied'
                            ? '已拒绝'
                            : '调用中...'}
                    </p>
                    {part.state === 'output-available' && (
                      <pre>{JSON.stringify(part.output, null, 2)}</pre>
                    )}
                    {part.state === 'output-error' && (
                      <p role="alert">{part.errorText}</p>
                    )}
                  </div>
                )
              }
              return null
            })}
          </article>
        ))}
      </section>
      {status === 'submitted' && <p role="status">正在等待回答...</p>}
      {error && (
        <div role="alert">
          <p>{error.message}</p>
          <button type="button" disabled={busy} onClick={() => void regenerate()}>
            重试回答
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="prompt">消息</label>
        <div className="composer">
          <input
            id="prompt"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
            autoComplete="off"
          />
          {busy ? (
            <button type="button" onClick={() => void stop()}>停止</button>
          ) : (
            <button type="submit" disabled={!input.trim()}>发送</button>
          )}
        </div>
      </form>
    </main>
  )
}
