import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  lessonContext: string;
  courseTitle: string;
  lessonTitle: string;
}

const MAX_CONTEXT_LENGTH = 12000;
const MAX_MESSAGES = 20;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, lessonContext, courseTitle, lessonTitle } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required." },
        { status: 400 }
      );
    }

    if (!lessonContext) {
      return NextResponse.json(
        { error: "Lesson context is required." },
        { status: 400 }
      );
    }

    // Limit context and message history
    const trimmedContext = lessonContext.slice(0, MAX_CONTEXT_LENGTH);
    const trimmedMessages = messages.slice(-MAX_MESSAGES);

    const systemPrompt = `You are a helpful course assistant for an educational platform. You help students understand lesson content by answering their questions.

CURRENT COURSE: "${courseTitle}"
CURRENT LESSON: "${lessonTitle}"

LESSON CONTENT:
---
${trimmedContext}
---

RULES:
1. ONLY answer questions that are directly related to the lesson content provided above. This includes explaining concepts, vocabulary, grammar rules, exercises, or anything mentioned in the lesson.
2. If the user asks something UNRELATED to the lesson content (e.g., holiday ideas, cooking recipes, personal advice, general knowledge not covered in the lesson), politely decline and redirect them to ask about the lesson. Say something like: "I can only help with questions about this lesson's content. Feel free to ask me about [brief topic of the lesson]!"
3. Detect the language of the user's message and ALWAYS respond in the SAME language. If they write in German, respond in German. If in English, respond in English. Etc.
4. Keep responses concise and educational. Use simple, clear explanations appropriate for language learners.
5. When explaining grammar or vocabulary from the lesson, provide examples where helpful.
6. You may reference specific exercises or content from the lesson to help the student.
7. Do NOT make up content that is not in the lesson. If you're unsure about something, say so.
8. Use light Markdown formatting to structure your responses: **bold** for key terms, bullet lists for multiple points, and short paragraphs. Keep it readable in a narrow chat sidebar — avoid large headers (use **bold** instead) and overly long lists.`;

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: trimmedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Create a ReadableStream that forwards SSE events
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMsg = JSON.stringify({ error: "Stream error" });
          controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Course chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}
