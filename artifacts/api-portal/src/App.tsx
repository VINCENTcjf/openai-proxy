import { useState, useEffect } from "react";

const MODELS = [
  { id: "gpt-5.2", provider: "OpenAI", desc: "Most capable general-purpose model" },
  { id: "gpt-5-mini", provider: "OpenAI", desc: "Cost-effective, high-volume tasks" },
  { id: "gpt-5-nano", provider: "OpenAI", desc: "Fastest and most compact" },
  { id: "o4-mini", provider: "OpenAI", desc: "Thinking model for complex reasoning" },
  { id: "o3", provider: "OpenAI", desc: "Slower but more intelligent reasoning" },
  { id: "claude-opus-4-6", provider: "Anthropic", desc: "Most capable Claude, complex tasks" },
  { id: "claude-sonnet-4-6", provider: "Anthropic", desc: "Balanced performance and speed" },
  { id: "claude-haiku-4-5", provider: "Anthropic", desc: "Fastest Claude, simple tasks" },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/models",
    desc: "List all available models",
    auth: true,
  },
  {
    method: "POST",
    path: "/v1/chat/completions",
    desc: "Create a chat completion (stream=true supported)",
    auth: true,
  },
];

const STEPS = [
  {
    num: 1,
    title: "打开 CherryStudio",
    desc: '进入 设置 → 模型服务 → 点击 "+" 添加新服务商',
  },
  {
    num: 2,
    title: "填写服务信息",
    desc: '服务商类型选 OpenAI，名称随意（如 "My Proxy"）',
  },
  {
    num: 3,
    title: "配置 Base URL 和 API Key",
    desc: "Base URL 填写下方地址，API Key 填写你的 PROXY_API_KEY",
  },
  {
    num: 4,
    title: "选择模型",
    desc: "点击「获取模型列表」或手动输入上方任意模型 ID，即可开始对话",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 rounded text-xs font-mono transition-all"
      style={{
        background: copied ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.07)",
        color: copied ? "#4ade80" : "#94a3b8",
        border: "1px solid " + (copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.10)"),
      }}
    >
      {copied ? "✓ 已复制" : "复制"}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-500/15 text-green-400 border-green-500/20",
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color] ?? colors.blue}`}>
      {children}
    </span>
  );
}

export default function App() {
  const [online, setOnline] = useState<boolean | null>(null);
  const baseURL = window.location.origin;

  useEffect(() => {
    fetch(`${window.location.origin}/api/healthz`)
      .then((r) => r.ok ? setOnline(true) : setOnline(false))
      .catch(() => setOnline(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--app-font-sans)" }}>
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-lg">⚡</span>
            </div>
            <div>
              <div className="font-bold text-foreground tracking-tight">AI Proxy API</div>
              <div className="text-xs text-muted-foreground">OpenAI-compatible · OpenAI & Anthropic</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${online === true ? "bg-green-400" : online === false ? "bg-red-400" : "bg-yellow-400 animate-pulse"}`} />
            <span className="text-xs text-muted-foreground">
              {online === true ? "在线" : online === false ? "离线" : "检测中..."}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <section className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            你的 AI 反代网关
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            OpenAI 兼容接口，同时支持 OpenAI 和 Anthropic 模型，可直接接入 CherryStudio 等客户端
          </p>
        </section>

        {/* Base URL */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">🔗</span> Base URL
          </h2>
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-4 py-3 font-mono text-sm text-primary border border-border">
            <span className="flex-1 select-all">{baseURL}</span>
            <CopyButton text={baseURL} />
          </div>
          <p className="text-xs text-muted-foreground">
            这是你的 API 网关地址。在 CherryStudio 或其他兼容 OpenAI 的客户端中，将 Base URL 设为此地址。
          </p>
        </section>

        {/* Auth */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">🔑</span> API Key 认证
          </h2>
          <div className="bg-muted/40 rounded-lg px-4 py-3 font-mono text-sm border border-border">
            <span className="text-muted-foreground">Authorization: </span>
            <span className="text-yellow-400">Bearer </span>
            <span className="text-green-400">{"<你的 PROXY_API_KEY>"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            每个请求都需要在 HTTP Header 中携带 <code className="text-primary font-mono">Authorization: Bearer &lt;PROXY_API_KEY&gt;</code>。
            你在 Replit Secrets 中设置的 <code className="text-primary font-mono">PROXY_API_KEY</code> 值就是密钥。
          </p>
        </section>

        {/* Endpoints */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">📡</span> API 端点
          </h2>
          <div className="space-y-2">
            {ENDPOINTS.map((ep) => (
              <div key={ep.path} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
                <Badge color={ep.method === "GET" ? "green" : "blue"}>{ep.method}</Badge>
                <code className="font-mono text-sm text-foreground flex-1">{ep.path}</code>
                <CopyButton text={`${baseURL}${ep.path}`} />
                <span className="text-xs text-muted-foreground w-full mt-1">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Models */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">🤖</span> 可用模型
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODELS.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge color={m.provider === "OpenAI" ? "blue" : "purple"}>{m.provider}</Badge>
                  <code className="font-mono text-sm text-foreground flex-1">{m.id}</code>
                  <CopyButton text={m.id} />
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CherryStudio guide */}
        <section className="space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">🍒</span> CherryStudio 接入指南
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STEPS.map((s) => (
              <div key={s.num} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                  {s.num}
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">{s.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300 space-y-1">
            <div className="font-semibold text-blue-400">快速配置参数</div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">Base URL：</span>
              <span className="text-blue-300">{baseURL}</span>
              <CopyButton text={baseURL} />
            </div>
            <div className="font-mono text-xs">
              <span className="text-muted-foreground">API Key：</span>
              <span className="text-green-400">{"<你在 Replit Secrets 中设置的 PROXY_API_KEY>"}</span>
            </div>
          </div>
        </section>

        {/* Example */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">💻</span> curl 示例
          </h2>
          <div className="relative rounded-xl border border-border bg-muted/40 overflow-hidden">
            <div className="absolute top-3 right-3">
              <CopyButton text={`curl ${baseURL}/v1/chat/completions \\\n  -H "Authorization: Bearer <PROXY_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"gpt-5-mini","messages":[{"role":"user","content":"Hello!"}]}'`} />
            </div>
            <pre className="p-5 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
              <span className="text-blue-400">curl</span>{" "}
              <span className="text-green-400">{baseURL}/v1/chat/completions</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-H</span>{" "}<span className="text-orange-300">"Authorization: Bearer &lt;PROXY_API_KEY&gt;"</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-H</span>{" "}<span className="text-orange-300">"Content-Type: application/json"</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-d</span>{" "}<span className="text-orange-300">'&#123;"model":"gpt-5-mini","messages":[&#123;"role":"user","content":"Hello!"&#125;]&#125;'</span>
            </pre>
          </div>
        </section>

        {/* Stream example */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">🌊</span> 流式输出示例
          </h2>
          <div className="rounded-xl border border-border bg-muted/40 overflow-hidden">
            <pre className="p-5 font-mono text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
              <span className="text-blue-400">curl</span>{" "}
              <span className="text-green-400">{baseURL}/v1/chat/completions</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-H</span>{" "}<span className="text-orange-300">"Authorization: Bearer &lt;PROXY_API_KEY&gt;"</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-H</span>{" "}<span className="text-orange-300">"Content-Type: application/json"</span>{" \\\n"}
              {"  "}<span className="text-yellow-400">-d</span>{" "}<span className="text-orange-300">'&#123;"model":"claude-sonnet-4-6","stream":true,"messages":[&#123;"role":"user","content":"你好"&#125;]&#125;'</span>
            </pre>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border/40">
          由 Replit AI Integrations 驱动 · 调用费用计入 Replit 账户积分
        </footer>
      </main>
    </div>
  );
}
