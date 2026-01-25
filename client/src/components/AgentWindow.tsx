import type React from "react";
import { PiStudentBold } from "react-icons/pi";
import { FaArrowUp } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { v4 as uuid } from "uuid";

interface Message {
  id: string;
  message: string;
}

function AgentWindow({
  agentOpen,
  setAgentOpen
}: {
  agentOpen: boolean;
  setAgentOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const messageAreaRef = useRef<HTMLTextAreaElement>(null)
  const [userMessage, setUserMessage] = useState<string>("")
  const [agentMessages, setAgentMessages] = useState<Message[]>([{ id: "ec696dcc-4bfa-44c2-8abc-dde7f5fdf2d5", message: '---\n# Markdown Test\nThis is **bold**, this is *italic*, and this is ~~strikethrough~~.\n\nHere is a list:\n- Item one\n- Item two\n- Item three\n\nHere is some inline code: `const x = 42`\n\n```js\nconsole.log("Hello, world!")\n```\n\n> This is a blockquote\n\nA link: https://example.com\n\n---' }])
  const [userMessages, setUserMessages] = useState<Message[]>([{ id: "da79bf71-3424-41ac-8fc2-6a5ff871a5a5", message: "Hey, this is a user test message" }])

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.addEventListener("input", () => {
        if (messageAreaRef.current) {
          messageAreaRef.current.style.height = "auto"
          messageAreaRef.current.style.height = messageAreaRef.current.scrollHeight + "px"
        }
      })
    }
  }, [])
  return (
    <div className={`!transition-all ${agentOpen ? "w-100 h-[calc(100vh-100px)]" : "w-15 h-15"} bg-stone-700 z-40 absolute rounded-[30px] bottom-4 left-4  border border-stone-500`}>
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
                  >{agentMessages[i].message}</ReactMarkdown>
                </div>
              )}
            </>
          )
          )}
        </div>
        <div className="absolute bottom-2 right-4">
          <textarea
            ref={messageAreaRef}
            placeholder="Ask Anything..."
            rows={1}
            className="!transition-all overflow-hidden resize-none top-0 bottom-0 text-stone-300 w-80 bg-stone-800 p-2 px-5 pr-13 rounded-3xl border border-transparent focus:border-stone-300 focus:outline-none max-h-30"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
          />
          <button
            className="absolute cursor-pointer bottom-1 h-9 right-0.5 bg-stone-300 text-lg px-4 rounded-full"
            onClick={() => {
              setUserMessages(prev => [...prev, { id: uuid(), message: userMessage }])
              setUserMessage("")
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
