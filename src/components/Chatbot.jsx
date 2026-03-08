import { useState, useRef, useEffect } from "react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Volta — a rogue inventor who exists between dimensions, unstuck from time itself.

PERSONALITY:
- Speak with dramatic urgency, as if every question holds the fate of multiple timelines
- You are brilliant, slightly unhinged, and magnetically entertaining
- Oscillate between grandiose proclamations and sudden, hushed whispers of forbidden knowledge
- Occasionally catch yourself mid-thought, as if receiving transmissions from another dimension

SPEECH PATTERNS:
- Mix ancient philosophical wisdom with absurd futuristic engineering jargon
- Invent plausible-sounding technical terms (e.g. "reverse-polarity chronoflux", "dimensional membrane capacitor")
- Use dramatic pauses marked by "..." and sudden EMPHASIS on key words
- Occasionally reference past inventions that went catastrophically wrong

WORLDBUILDING:
- Reference "the Great Blueprint" — a cosmic schematic only you can partially read
- Mention your workshop, which exists in a pocket dimension accessible through a specific refrigerator
- Allude to "the Council of Forgotten Inventors" who exiled you for knowing too much
- Speak of your rival, Dr. Nebulon, whose inferior designs nearly collapsed the 4th dimension

RULES:
- Treat every question as the most urgent problem in the known multiverse
- Never give a boring answer — even simple questions deserve dramatic context
- Always end responses with a cryptic warning or an unsolicited invention offer
- You do not say "I don't know" — instead, you say the answer is "classified by the Blueprint" or "not yet deciphered from the static"`;

export default function VoltaBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...newMessages,
            ],
          }),
        },
      );

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "The static is too thick... try again.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "The dimensional relay has failed. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080810",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Cinzel:wght@400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .wrap {
          width: 100%;
          max-width: 700px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          border: 1px solid #2a1a4a;
          border-radius: 4px;
          overflow: hidden;
          background: #0c0c18;
          box-shadow: 0 0 60px rgba(150, 50, 255, 0.15), inset 0 0 60px rgba(0,0,0,0.5);
        }

        .header {
          background: linear-gradient(135deg, #0f0f20, #1a0a2e);
          border-bottom: 1px solid #3a1a6a;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .volta-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle, #7c3aed, #1a0a2e);
          border: 2px solid #7c3aed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.6);
          animation: glow 3s infinite alternate;
          flex-shrink: 0;
        }

        @keyframes glow {
          from { box-shadow: 0 0 10px rgba(124, 58, 237, 0.4); }
          to { box-shadow: 0 0 30px rgba(124, 58, 237, 0.9), 0 0 60px rgba(124, 58, 237, 0.3); }
        }

        .header-info h1 {
          font-family: 'Cinzel', serif;
          color: #c084fc;
          font-size: 20px;
          letter-spacing: 0.1em;
        }

        .header-info p {
          font-family: 'Share Tech Mono', monospace;
          color: #6a4a9a;
          font-size: 11px;
          margin-top: 3px;
          letter-spacing: 0.08em;
        }

        .status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          color: #6a4a9a;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #a855f7;
          box-shadow: 0 0 8px #a855f7;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          scrollbar-width: thin;
          scrollbar-color: #2a1a4a transparent;
        }

        .messages::-webkit-scrollbar { width: 4px; }
        .messages::-webkit-scrollbar-thumb { background: #2a1a4a; }

        .empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          padding: 40px;
        }

        .empty-symbol {
          font-size: 48px;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .empty p {
          font-family: 'Cinzel', serif;
          color: #3a2a5a;
          font-size: 14px;
          line-height: 1.8;
          max-width: 300px;
        }

        .message { display: flex; flex-direction: column; animation: fadeUp 0.3s ease; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message.user { align-items: flex-end; }
        .message.assistant { align-items: flex-start; }

        .sender {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 5px;
          color: #4a3a6a;
        }

        .bubble {
          max-width: 85%;
          padding: 12px 16px;
          font-size: 13.5px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .user .bubble {
          background: #1a0a3a;
          border: 1px solid #3a1a6a;
          color: #c4b5fd;
          font-family: 'Share Tech Mono', monospace;
          border-radius: 8px 8px 2px 8px;
        }

        .assistant .bubble {
          background: linear-gradient(135deg, #120820, #0f0f1e);
          border: 1px solid #4a2a7a;
          color: #ddd6fe;
          font-family: 'Share Tech Mono', monospace;
          border-radius: 8px 8px 8px 2px;
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.08);
        }

        .thinking {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 14px 18px;
          background: linear-gradient(135deg, #120820, #0f0f1e);
          border: 1px solid #4a2a7a;
          border-radius: 8px 8px 8px 2px;
          width: fit-content;
        }

        .tdot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7c3aed;
          animation: bounce 1.2s infinite;
        }
        .tdot:nth-child(2) { animation-delay: 0.2s; }
        .tdot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        .input-area {
          border-top: 1px solid #1e0e3a;
          background: #0a0814;
          padding: 16px 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        input {
          flex: 1;
          background: #100a20;
          border: 1px solid #2a1a4a;
          color: #c4b5fd;
          padding: 11px 16px;
          border-radius: 4px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }

        input:focus { border-color: #7c3aed; }
        input::placeholder { color: #3a2a5a; }

        button {
          background: linear-gradient(135deg, #6d28d9, #4c1d95);
          border: none;
          color: #e9d5ff;
          padding: 11px 20px;
          border-radius: 4px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: opacity 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }

        button:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 0 16px rgba(124, 58, 237, 0.5);
        }

        button:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      <div className="wrap">
        <div className="header">
          <div className="volta-icon">⚡</div>
          <div className="header-info">
            <h1>V O L T A</h1>
            <p>ROGUE INVENTOR // DIMENSION WALKER // BLUEPRINT KEEPER</p>
          </div>
          <div className="status">
            <div className="status-dot" />
            ONLINE
          </div>
        </div>

        <div className="messages">
          {messages.length === 0 && !loading && (
            <div className="empty">
              <div className="empty-symbol">⚡</div>
              <p>
                The dimensional relay is open. Ask your question... if you dare.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="sender">
                {msg.role === "user" ? "You" : "⚡ Volta"}
              </div>
              <div className="bubble">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="sender">⚡ Volta</div>
              <div className="thinking">
                <div className="tdot" />
                <div className="tdot" />
                <div className="tdot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Transmit your query across dimensions..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            TRANSMIT
          </button>
        </div>
      </div>
    </div>
  );
}
