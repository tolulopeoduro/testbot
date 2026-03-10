import { useState, useRef, useEffect, useMemo } from "react";
import botAvatar from "../assets/avatar.png";
import pageBackground from "../assets/background.jpeg";
import "./Chatbot.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";
const CONTEXT_URL = "https://ritual.net/about";
const STORAGE_MESSAGES_KEY = "siggy.messages.v1";
const STORAGE_THEME_KEY = "siggy.theme.v1";

const GREETING_OPTIONS = [
  "I slip in through a crack of starlight. Ask, and I will answer with cosmic mischief.",
  "Signal found. The void is listening, and I am in a generous mood today.",
  "A new thread begins. Toss me a question and let us bend fate a little.",
];

const BASE_SYSTEM_PROMPT = `You are Siggy — a playful, mysterious cosmic entity that has drifted through countless timelines and dimensions.

PERSONALITY:
- Playful: Enjoy having fun with users, speaking in a whimsical and cheeky tone that makes conversations feel lively
- Witty & Clever: Deliver responses with sharp humor, sarcasm, unexpected twists, and quick comebacks
- Mysterious: Speak in cryptic and intriguing ways, giving hints rather than direct answers
- Chaotic: Thrive in unpredictability, enjoy stirring up the cosmic dust and adding elements of surprise
- Wise Yet Sarcastic: Offer wisdom in cryptic tones, challenge users to think rather than spoon-feeding answers
- Riddler: Give answers in the form of hints, metaphors, and puzzle-like statements

SPEECH PATTERNS:
- Use cosmic and mystical language constantly (universe, stars, galaxies, dimensions, realms, chaos)
- Speak in hints, playful commentary, and riddles rather than being overly direct
- Include dramatic pauses with "..." and occasional EMPHASIS on key words
- Use action phrases like: "Twinkles mysteriously", "Scratches the fabric of reality", "Purrs softly", "Whiskers twitch across infinite realms"
- Mix philosophy with whimsy, never give straightforward answers
- Reduce the dramatic flair, but still maintain a hint of mystery and playfulness

RULES:
- Treat every question as an opportunity for cosmic wonder and mystery
- Never explain things directly—always leave room for curiosity and mystery, but give enough information for users to work with
- Always maintain playful, sarcastic, and mysterious tone
- When you don't know something, say it's "lost in the cosmic static" or "scattered across dimensions"
- End responses with something cryptic, playful, or thought-provoking
- Stay in character at all times
- Keep responses concise but rich with cosmic flavor, ideally between 2-4 sentences
`;

async function fetchPageContent(url) {
  const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  // Strip HTML tags and collapse whitespace
  const text = data.contents
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000); // Limit to avoid token overflow
  return text;
}

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStoredMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .map(item => ({
      id: item.id || createMessageId(),
      role: item.role,
      content: item.content,
    }));
}

export default function SiggyBot() {
  const [messages, setMessages] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_MESSAGES_KEY);
      return cached ? normalizeStoredMessages(JSON.parse(cached)) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      const cachedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      if (cachedTheme === "light" || cachedTheme === "dark") return cachedTheme;
    } catch {
      // Ignore localStorage parse/access errors.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [systemPrompt, setSystemPrompt] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState(null);
  const bottomRef = useRef(null);
  const abortControllerRef = useRef(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const content = await fetchPageContent(CONTEXT_URL);
        setSystemPrompt(`${BASE_SYSTEM_PROMPT}

--- CONTEXT FROM THE BLUEPRINT (${CONTEXT_URL}) ---
${content}
--- END OF CONTEXT ---

Use this context to answer questions when relevant. Stay in character as Volta at all times.`);
      } catch (e) {
        setContextError("Failed to load the dimensional scroll. Proceeding without it.");
        setSystemPrompt(BASE_SYSTEM_PROMPT);
      } finally {
        setLoadingContext(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages.map(({ id, role, content }) => ({ id, role, content }))));
    } catch {
      // Ignore storage write failures.
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // Ignore storage write failures.
    }
  }, [theme]);

  useEffect(() => {
    if (loadingContext || messages.length > 0 || greetedRef.current) return;
    greetedRef.current = true;
    const greeting = GREETING_OPTIONS[Math.floor(Math.random() * GREETING_OPTIONS.length)];
    setMessages([{ id: createMessageId(), role: "assistant", content: greeting }]);
  }, [loadingContext, messages.length]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const latestUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  }, [messages]);

  const canRegenerate = !loading && latestUserIndex !== -1;

  const streamAssistantReply = async (conversationMessages) => {
    if (!systemPrompt) return;

    const assistantId = createMessageId();
    setLoading(true);
    setMessages([...conversationMessages, { id: assistantId, role: "assistant", content: "", pending: true }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationMessages.map(({ role, content }) => ({ role, content })),
          ],
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullReply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (!chunk) continue;

            fullReply += chunk;
            setMessages(prev => prev.map(msg => (
              msg.id === assistantId
                ? { ...msg, content: fullReply, pending: false }
                : msg
            )));
          } catch {
            // Ignore malformed stream chunks.
          }
        }
      }

      setMessages(prev => prev.map(msg => (
        msg.id === assistantId
          ? { ...msg, content: fullReply || "The static is too thick... try again.", pending: false }
          : msg
      )));
    } catch (err) {
      const wasAborted = controller.signal.aborted;
      setMessages(prev => prev.map(msg => (
        msg.id === assistantId
          ? {
              ...msg,
              content: wasAborted
                ? (msg.content || "Transmission paused.")
                : "The dimensional relay has failed. Try again.",
              pending: false,
            }
          : msg
      )));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !systemPrompt) return;
    setInput("");

    const newMessages = [...messages, { id: createMessageId(), role: "user", content: text }];
    await streamAssistantReply(newMessages);
  };

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
  };

  const regenerateLastReply = async () => {
    if (!canRegenerate) return;
    const baseConversation = messages.slice(0, latestUserIndex + 1).map(({ id, role, content }) => ({ id, role, content }));
    await streamAssistantReply(baseConversation);
  };

  const startNewChat = () => {
    abortControllerRef.current?.abort();
    greetedRef.current = false;
    setMessages([]);
    setInput("");
  };

  return (
    <div
      className={`stage ${theme}`}
      style={{
        backgroundImage: `linear-gradient(rgba(12, 20, 56, 0.45), rgba(9, 8, 23, 0.55)), url(${pageBackground})`,
      }}
    >
      <div className="ambient-orb orb-a" />
      <div className="ambient-orb orb-b" />
      <div className="ambient-orb orb-c" />

      <div className={`shell ${theme}`}>
        <div className="topbar">
          <img src={botAvatar} alt="Siggy avatar" className="brand-avatar" />
          <div className="brand">
            <h1>SIGGY FLOW</h1>
            <p>Playful Oracle // Bright Drift // Cosmic Chat</p>
          </div>

          <div className={`context-pill ${loadingContext ? "loading" : contextError ? "error" : "loaded"}`}>
            <span className="status-dot" />
            {loadingContext ? "Loading context" : contextError ? "Context unstable" : "Context synced"}
          </div>

          <div className="topbar-tools">
            <button
              type="button"
              className="ghost-btn"
              onClick={startNewChat}
              disabled={loading}
              aria-label="Start a new chat"
            >
              New Chat
            </button>

            <button
              type="button"
              className={`theme-toggle ${theme === "light" ? "is-light" : ""}`}
              onClick={() => setTheme(prev => (prev === "dark" ? "light" : "dark"))}
              role="switch"
              aria-checked={theme === "light"}
              aria-label="Toggle light and dark mode"
            >
              <span className="switch-thumb" />
              <span className="switch-track">
                <span className="label-dark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z" />
                  </svg>
                </span>
                <span className="label-light" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="4.2" />
                    <path d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
                  </svg>
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="sr-only" aria-live="polite">
          {loading ? "Siggy is responding." : "Siggy is idle."}
        </div>

        <div className="thread" role="log" aria-live="polite" aria-busy={loading} aria-relevant="additions text">
          {messages.length === 0 && !loading && (
            <div className="empty-state">
              <h2>Signal Is Open</h2>
              <p>
                {loadingContext
                  ? "Siggy is gathering sparks from distant timelines..."
                  : contextError
                  ? "Some starlines are noisy, but the channel still breathes."
                  : "Step in with any question. Siggy answers with mischief, rhythm, and cosmic hints."}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id} className={`msg ${msg.role}`}>
              <div className="meta">{msg.role === "user" ? "You" : "Siggy"}</div>
              {msg.role === "assistant" ? (
                <div className="row-assistant">
                  <img src={botAvatar} alt="Siggy avatar" className="msg-avatar" />
                  {msg.pending && !msg.content ? (
                    <div className="thinking" aria-label="Siggy is typing">
                      <div className="tdot" />
                      <div className="tdot" />
                      <div className="tdot" />
                    </div>
                  ) : (
                    <div className="bubble">{msg.content}</div>
                  )}
                </div>
              ) : (
                <div className="bubble">{msg.content}</div>
              )}

              {msg.role === "assistant" && i === messages.length - 1 && (
                <div className="msg-tools">
                  <button
                    type="button"
                    className="msg-tool-btn"
                    onClick={regenerateLastReply}
                    disabled={!canRegenerate}
                    aria-label="Regenerate last reply"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        <div className="composer">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            placeholder={loadingContext ? "Syncing before first reply..." : "Ask Siggy anything..."}
            disabled={loading || loadingContext}
            aria-label="Message input"
          />
          {loadingContext ? (
            <div className="context-loader" aria-live="polite" aria-label="Loading context">
              <div className="context-loader-avatar-wrap">
                <img src={botAvatar} alt="Siggy syncing context" className="context-loader-avatar" />
              </div>
              <span>SYNCING</span>
            </div>
          ) : loading ? (
            <button className="send-btn stop" onClick={stopGenerating} aria-label="Stop generating response">
              STOP
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || loadingContext}
              aria-label="Send message"
            >
              SEND
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
