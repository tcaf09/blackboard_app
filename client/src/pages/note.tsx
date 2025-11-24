import { useState } from "react";
import Toolbar from "../components/Toolbar";
import InfiniteCanvas from "@/components/InfiniteCanvas";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useRef } from "react";
import { type JSONContent } from "@tiptap/react";

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

function Note() {
  const authToken = localStorage.getItem("token");
  const { id } = useParams<{ id: string }>();
  const isLoading = useRef<boolean>(true);

  const [paths, setPaths] = useState<Path[]>([]);
  const [textboxes, setTextboxes] = useState<Box[]>([]);

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
      />
      <div
        className="absolute hover:scale-103 !transition-all !duration-150 !ease-in-out top-4 left-4 p-4 text-stone-300 text-2xl bg-stone-800 rounded-lg cursor-pointer z-50 inset-shadow-xs inset-shadow-stone-700 shadow-sm shadow-stone-950"
        onClick={() => navigate("/dashboard")}
      >
        <FaHome />
      </div>
      <div className="absolute top-4 right-4 p-3 px-6 text-stone-300 text-lg bg-stone-800 inset-shadow-sm inset-shadow-stone-700 rounded-lg shadow-sm shadow-stone-950 flex z-50">
        <div
          className={`text-3xl mr-2 ${
            saved ? "text-transparent" : "text-stone-300"
          }`}
        >
          •
        </div>
        <div className="mt-1">{noteName || "Loading..."}</div>
      </div>
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
      />
    </>
  );
}

export default Note;
