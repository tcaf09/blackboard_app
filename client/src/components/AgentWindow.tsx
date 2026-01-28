import type React from "react";
import { PiStudentBold } from "react-icons/pi";
import { FaArrowUp } from "react-icons/fa";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { v4 as uuid } from "uuid";
import axios from "axios";

interface Message {
  id: string;
  role: string;
  message: string;
}

function AgentWindow({
  agentOpen,
  setAgentOpen,
  token,
}: {
  agentOpen: boolean;
  setAgentOpen: React.Dispatch<React.SetStateAction<boolean>>;
  token: string | null;
}) {
  const messageAreaRef = useRef<HTMLTextAreaElement>(null)
  const [userMessage, setUserMessage] = useState<string>("")
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [userMessages, setUserMessages] = useState<Message[]>([])

  function submitUserMessage() {
    const userContext = userMessages.slice(-5)
    const agentContext = agentMessages.slice(-5)
    const totalContext = userContext.map((message, i) => [message, agentContext[i]])
    setUserMessages(prev => [...prev, { id: uuid(), role: "user", message: userMessage }])
    axios.post(
      `${import.meta.env.VITE_API_URL}/api/ai/respond`,
      { query: userMessage, context: totalContext },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }).then(res => {
        const response = res.data.message.candidates[0].content.parts[0].text
        if (response) {
          setAgentMessages(prev => [...prev, { id: uuid(), role: "assistant", message: response }])
        }
      })
    setUserMessage("")
  }

  return (
    <div className={`!transition-all ${agentOpen ? "w-[calc(100vw/3)] h-[calc(100vh-100px)]" : "w-15 h-15"} bg-stone-700 z-40 absolute rounded-[30px] bottom-4 left-4  border border-stone-500`}>
      <div
        className="!transition-all hover:bg-stone-600 w-15 h-15 z-50 absolute bottom-0 left-0 rounded-full cursor-pointer text-stone-300 text-3xl flex justify-center items-center"
        onClick={() => setAgentOpen(prev => !prev)}
      >
        <PiStudentBold />
      </div>
      <div className={agentOpen ? "" : "hidden"}>
        <div className="absolute inset-0 p-5 flex flex-col items-end overflow-scroll bottom-10">
          {userMessages.map((message, i) => (
            <>
              <div className="animate-message-in text-stone-300 bg-stone-800 p-2 px-4 max-w-70 rounded-3xl" key={message.id}>
                {message.message}
              </div>
              {agentMessages[i] && (
                <div className="w-full h-auto text-stone-300 my-3" key={agentMessages[i].id}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      hr: ({ node, ...props }) => (
                        <hr className="my-6 border-stone-500" {...props} />
                      )
                    }}
                  >{agentMessages[i].message.replace(/\\n/g, "\n")}</ReactMarkdown>
                </div>
              )}
            </>
          )
          )}
        </div>
        <div className="absolute bottom-2 right-4 w-[calc(100%-80px)]">
          <textarea
            ref={messageAreaRef}
            placeholder="Ask Anything..."
            rows={1}
            className="!transition-all block overflow-hidden resize-none top-0 bottom-0 text-stone-300 w-full bg-stone-800 p-2 px-5 pr-13 rounded-3xl border border-transparent focus:border-stone-300 outline-none max-h-30"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onInput={(e) => {
              e.currentTarget.style.height = "auto"
              e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"
            }
            }
            onKeyDown={(e) => {
              if (!userMessage.trim()) return
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submitUserMessage()
              }
            }
            }
          />
          <button
            className="absolute cursor-pointer h-8 bottom-1 right-1 bg-stone-300 text-lg px-4 rounded-full"
            onClick={() => {
              if (!userMessage.trim()) return
              submitUserMessage()
            }}
          >
            <FaArrowUp />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AgentWindow
