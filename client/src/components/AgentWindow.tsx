import type React from "react";
import { PiStudentBold } from "react-icons/pi";

function AgentWindow({
  agentOpen,
  setAgentOpen
}: {
  agentOpen: boolean;
  setAgentOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  return (
    <div className={`!transition-all ${agentOpen ? "w-100 h-[calc(100vh-100px)]" : "w-15 h-15"} bg-stone-700 z-40 absolute rounded-[30px] bottom-4 left-4  border border-stone-500`}>
      <div
        className="w-15 h-15 z-50 absolute bottom-0 left-0 rounded-full cursor-pointer text-stone-300 text-3xl flex justify-center items-center"
        onClick={() => setAgentOpen(prev => !prev)}
      >
        <PiStudentBold />
      </div>
    </div>
  )
}

export default AgentWindow
