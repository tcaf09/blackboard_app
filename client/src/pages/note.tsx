import { useState } from "react";
import ContextMenu from "@/components/ContextMenu";
import Toolbar from "../components/Toolbar";
import InfiniteCanvas from "@/components/InfiniteCanvas";
import PalmRejecWin from "@/components/PalmRejecWin";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useRef } from "react";
import { type JSONContent } from "@tiptap/react";
import AgentWindow from "@/components/AgentWindow";

type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number | "auto";
  content: JSONContent;
};

type Path = {
  id: string;
  colour: string;
  points: [number, number, number][];
  size: number;
};

type Pos = {
  x: number;
  y: number;
};

function Note() {
  const authToken = localStorage.getItem("token");
  const { id } = useParams<{ id: string }>();
  const isLoading = useRef<boolean>(true);


  const [paths, setPaths] = useState<Path[]>([]);
  const [textboxes, setTextboxes] = useState<Box[]>([]);
  const [bgPattern, setBgPattern] = useState<string | null>(null);

  const [contextPos, setContextPos] = useState<Pos | null>(null);
  const [contextType, setContextType] = useState<string>("textbox");
  const contextRef = useRef<HTMLDivElement>(null);
  const [contextTargetIndex, setContextTargetIndex] = useState<string | null>(
    null
  );

  const [palmRejec, setPalmRejec] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState<string>("mouse");
  const [colour, setColour] = useState<string>("#E0E0E0");
  const [penSizes, setPenSizes] = useState<number[]>([4, 4, 4, 4]);
  const [colours, setColours] = useState<string[]>([
    "#E0E0E0",
    "#6CA0DC",
    "#E07A5F",
    "#7FB069",
  ]);

  const [noteName, setNoteName] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(true);
  const [agentOpen, setAgentOpen] = useState<boolean>(false)

  const deleteTextbox = () => {
    if (contextTargetIndex !== null) {
      setTextboxes((prev) => prev.filter((b) => b.id !== contextTargetIndex));
      setContextPos(null);
      setContextTargetIndex(null);
    }
  };

  useEffect(() => {
    async function loadNote() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/notes/${id}`,
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + authToken,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Error loading note");

        const data = await res.json();
        setPaths(data.paths);
        setTextboxes(data.textboxes);
        setNoteName(data.name);
        setBgPattern(data.bgPattern);
      } catch (err) {
        console.log(err);
      } finally {
        isLoading.current = false;
      }
    }

    loadNote();
  }, [id, authToken]);

  return (
    <>
      <Toolbar
        selected={selectedOption}
        setSelected={setSelectedOption}
        setColour={setColour}
        colour={colour}
        colours={colours}
        penSizes={penSizes}
        setPenSizes={setPenSizes}
        setColours={setColours}
        bgPattern={bgPattern}
        setBgPattern={setBgPattern}
      />
      <button
        className="absolute transition-all! duration-150 ease-in-out top-4 left-4 min-h-15 p-4 text-stone-300 text-xl bg-stone-700 rounded-lg cursor-pointer z-30 border border-stone-500 hover:bg-stone-600"
        onClick={() => navigate("/dashboard")}
      >
        <FaHome />
      </button>
      <div className="absolute top-4 right-4 min-h-15 p-3 text-stone-300 text-xl rounded-lg bg-stone-700 border border-stone-500 flex z-30">
        <div
          className={`text-3xl mr-2 ${saved ? "text-transparent" : "text-stone-300"
            }`}
        >
          •
        </div>
        <div className="mt-1">{noteName || "Loading..."}</div>
      </div>
      <AgentWindow agentOpen={agentOpen} setAgentOpen={setAgentOpen} />
      {palmRejec && (
        <PalmRejecWin
          win={palmRejec}
          setWin={setPalmRejec}
          selectedOption={selectedOption}
        />
      )}
      {contextPos && (
        <ContextMenu
          pos={contextPos}
          setPos={setContextPos}
          ref={contextRef}
          type={contextType}
          onDelete={deleteTextbox}
          palmRejec={palmRejec}
          setPalmRejec={setPalmRejec}
        />
      )}
      <InfiniteCanvas
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        colour={colour}
        colours={colours}
        penSizes={penSizes}
        paths={paths}
        textboxes={textboxes}
        setPaths={setPaths}
        setTextboxes={setTextboxes}
        id={id}
        authToken={authToken}
        isLoading={isLoading}
        setSaved={setSaved}
        bgPattern={bgPattern}
        setContextPos={setContextPos}
        contextPos={contextPos}
        setContextType={setContextType}
        setContextTargetIndex={setContextTargetIndex}
        contextRef={contextRef}
      />
    </>
  );
}

export default Note;
