// Cloudflare Workers Groq API Proxy for Claude Code
// Converts Anthropic Claude API format to Groq API format

const GROQ_MODEL = "moonshotai/kimi-k2-instruct";
const GROQ_MAX_OUTPUT_TOKENS = 16384;

export default {
  async fetch(request, env, ctx) {
    // 添加 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // 处理根路径
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        message: "Groq Anthropic Tool Proxy is alive 💡"
      }), {
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // 处理消息转换
    if (url.pathname === "/v1/messages" && request.method === "POST") {
      return handleMessages(request, corsHeaders);
    }
    
    return new Response("Not Found", { 
      status: 404,
      headers: corsHeaders
    });
  }
};

async function handleMessages(request, corsHeaders) {
  try {
    // 从多种可能的头部格式中提取 Groq API 密钥
    let groqApiKey = null;
    
    // 方式1: Authorization: Bearer <token>
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        groqApiKey = authHeader.replace('Bearer ', '');
      } else if (authHeader.startsWith('bearer ')) {
        groqApiKey = authHeader.replace('bearer ', '');
      } else {
        // 可能直接是 token
        groqApiKey = authHeader;
      }
    }
    
    // 方式2: x-api-key 头
    if (!groqApiKey) {
      groqApiKey = request.headers.get('x-api-key');
    }
    
    // 方式3: anthropic-api-key 头 (Claude Code 可能使用这个)
    if (!groqApiKey) {
      groqApiKey = request.headers.get('anthropic-api-key');
    }
    
    // 打印调试信息
    console.log("Headers received:", Object.fromEntries(request.headers.entries()));
    console.log("Extracted API key:", groqApiKey ? `${groqApiKey.substring(0, 10)}...` : 'null');
    
    if (!groqApiKey) {
      return new Response(JSON.stringify({
        error: "Missing API key",
        message: "Please provide Groq API key in Authorization, x-api-key, or anthropic-api-key header",
        debug: {
          headers: Object.fromEntries(request.headers.entries())
        }
      }), {
        status: 401,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    const requestData = await request.json();
    
    console.log("🚀 Anthropic → Groq | Model:", requestData.model);
    console.log("Request data:", JSON.stringify(requestData, null, 2));
    
    // 转换消息格式
    const openaiMessages = convertMessages(requestData.messages);
    const tools = requestData.tools ? convertTools(requestData.tools) : null;
    
    // 限制最大token数
    const maxTokens = Math.min(
      requestData.max_tokens || GROQ_MAX_OUTPUT_TOKENS, 
      GROQ_MAX_OUTPUT_TOKENS
    );
    
    if (requestData.max_tokens && requestData.max_tokens > GROQ_MAX_OUTPUT_TOKENS) {
      console.log(`⚠️  Capping max_tokens from ${requestData.max_tokens} to ${GROQ_MAX_OUTPUT_TOKENS}`);
    }
    
    // 构建Groq API请求
    const groqRequest = {
      model: GROQ_MODEL,
      messages: openaiMessages,
      temperature: requestData.temperature || 0.7,
      max_tokens: maxTokens,
      ...(tools && { tools }),
      ...(tools && { tool_choice: requestData.tool_choice || "auto" })
    };
    
    console.log("Groq request:", JSON.stringify(groqRequest, null, 2));
    
    // 调用Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(groqRequest)
    });
    
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API Error:", errorText);
      return new Response(JSON.stringify({
        error: "Groq API request failed",
        details: errorText,
        status: groqResponse.status
      }), {
        status: groqResponse.status,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    const completion = await groqResponse.json();
    const choice = completion.choices[0];
    const msg = choice.message;
    
    // 转换响应格式为Anthropic格式
    let toolContent;
    let stopReason;
    
    if (msg.tool_calls) {
      toolContent = convertToolCallsToAnthropic(msg.tool_calls);
      stopReason = "tool_use";
    } else {
      toolContent = [{ type: "text", text: msg.content }];
      stopReason = "end_turn";
    }
    
    const anthropicResponse = {
      id: `msg_${generateId()}`,
      model: `groq/${GROQ_MODEL}`,
      role: "assistant",
      type: "message",
      content: toolContent,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens
      }
    };
    
    console.log("Anthropic response:", JSON.stringify(anthropicResponse, null, 2));
    
    return new Response(JSON.stringify(anthropicResponse), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}

// 转换Anthropic消息格式到OpenAI格式
function convertMessages(messages) {
  const converted = [];
  for (const m of messages) {
    let content;
    
    if (typeof m.content === "string") {
      content = m.content;
    } else {
      const parts = [];
      for (const block of m.content) {
        if (block.type === "text") {
          parts.push(block.text);
        } else if (block.type === "tool_use") {
          const toolInfo = `[Tool Use: ${block.name}] ${JSON.stringify(block.input)}`;
          parts.push(toolInfo);
        } else if (block.type === "tool_result") {
          console.log(`📥 Tool Result for ${block.tool_use_id}:`, JSON.stringify(block.content, null, 2));
          parts.push(`<tool_result>${JSON.stringify(block.content)}</tool_result>`);
        }
      }
      content = parts.join("\n");
    }
    
    converted.push({ role: m.role, content });
  }
  return converted;
}

// 转换工具格式
function convertTools(tools) {
  return tools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description || "",
      parameters: t.input_schema
    }
  }));
}

// 转换工具调用到Anthropic格式
function convertToolCallsToAnthropic(toolCalls) {
  const content = [];
  
  for (const call of toolCalls) {
    const fn = call.function;
    const toolArgs = JSON.parse(fn.arguments);
    
    console.log(`🛠 Tool Call: ${fn.name}(${JSON.stringify(toolArgs, null, 2)})`);
    
    content.push({
      type: "tool_use",
      id: call.id,
      name: fn.name,
      input: toolArgs
    });
  }
  
  return content;
}

// 生成随机ID
function generateId() {
  return Math.random().toString(36).substring(2, 14);
}
