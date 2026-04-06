import { Router } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";

const router = Router();

const MODELS = [
  { id: "gpt-5.2", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "gpt-5-mini", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "gpt-5-nano", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "o4-mini", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "o3", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "claude-opus-4-6", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-sonnet-4-6", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-haiku-4-5", object: "model", created: 1700000000, owned_by: "anthropic" },
];

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

function authMiddleware(req: Request, res: Response, next: () => void) {
  const proxyKey = process.env.PROXY_API_KEY;
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!proxyKey || token !== proxyKey) {
    res.status(401).json({ error: { message: "Unauthorized", type: "invalid_request_error" } });
    return;
  }
  next();
}

router.get("/models", authMiddleware, (_req: Request, res: Response) => {
  res.json({ object: "list", data: MODELS });
});

router.post("/chat/completions", authMiddleware, async (req: Request, res: Response) => {
  const body = req.body as {
    model: string;
    messages: { role: string; content: string }[];
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
  };

  const { model, messages, stream = false } = body;

  const isAnthropic = model.startsWith("claude");
  const isOpenAI = model.startsWith("gpt") || model.startsWith("o");

  if (!isAnthropic && !isOpenAI) {
    res.status(400).json({ error: { message: `Unknown model: ${model}`, type: "invalid_request_error" } });
    return;
  }

  if (isOpenAI) {
    const openai = getOpenAIClient();
    try {
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const keepaliveTimer = setInterval(() => {
          res.write(": keepalive\n\n");
          if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
            (res as unknown as { flush: () => void }).flush();
          }
        }, 5000);

        req.on("close", () => clearInterval(keepaliveTimer));

        try {
          const openaiStream = await openai.chat.completions.create({
            model,
            messages: messages as OpenAI.ChatCompletionMessageParam[],
            stream: true,
          });

          for await (const chunk of openaiStream) {
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            res.write(data);
            if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
              (res as unknown as { flush: () => void }).flush();
            }
          }
          res.write("data: [DONE]\n\n");
          res.end();
        } finally {
          clearInterval(keepaliveTimer);
        }
      } else {
        const completion = await openai.chat.completions.create({
          model,
          messages: messages as OpenAI.ChatCompletionMessageParam[],
          stream: false,
        });
        res.json(completion);
      }
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      res.status(error.status ?? 500).json({
        error: { message: error.message ?? "OpenAI error", type: "api_error" },
      });
    }
    return;
  }

  // Anthropic
  const anthropic = getAnthropicClient();
  const systemMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role === "user" || m.role === "assistant") as Anthropic.MessageParam[];
  const systemText = systemMessages.map((m) => m.content).join("\n");

  const anthropicParams: Anthropic.MessageCreateParamsNonStreaming = {
    model,
    max_tokens: body.max_tokens ?? 8192,
    messages: chatMessages,
    ...(systemText ? { system: systemText } : {}),
  };

  try {
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const keepaliveTimer = setInterval(() => {
        res.write(": keepalive\n\n");
        if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
          (res as unknown as { flush: () => void }).flush();
        }
      }, 5000);

      req.on("close", () => clearInterval(keepaliveTimer));

      try {
        const anthropicStream = anthropic.messages.stream({
          ...anthropicParams,
          stream: true,
        } as Anthropic.MessageCreateParamsStreaming);

        let inputTokens = 0;
        let outputTokens = 0;
        const completionId = `chatcmpl-${Date.now()}`;

        for await (const event of anthropicStream) {
          if (event.type === "message_start") {
            inputTokens = event.message.usage?.input_tokens ?? 0;
          } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            outputTokens++;
            const chunk = {
              id: completionId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [
                {
                  index: 0,
                  delta: { role: "assistant", content: event.delta.text },
                  finish_reason: null,
                },
              ],
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
              (res as unknown as { flush: () => void }).flush();
            }
          } else if (event.type === "message_delta") {
            outputTokens = event.usage?.output_tokens ?? outputTokens;
          }
        }

        const finalChunk = {
          id: completionId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens },
        };
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } finally {
        clearInterval(keepaliveTimer);
      }
    } else {
      const message = await anthropic.messages.create(anthropicParams);
      const textBlock = message.content.find((b) => b.type === "text");
      const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
      const openAIFormat = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: text },
            finish_reason: message.stop_reason ?? "stop",
          },
        ],
        usage: {
          prompt_tokens: message.usage.input_tokens,
          completion_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens,
        },
      };
      res.json(openAIFormat);
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    res.status(error.status ?? 500).json({
      error: { message: error.message ?? "Anthropic error", type: "api_error" },
    });
  }
});

export default router;
