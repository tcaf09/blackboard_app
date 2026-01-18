import {
  FaEraser,
  FaHandPaper,
  FaICursor,
  FaMousePointer,
  FaPlus,
} from "react-icons/fa";
import ColourOption from "./ColourOption";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";
import { BsThreeDots } from "react-icons/bs";

function Toolbar({
  selected,
  setSelected,
  setColour,
  colour,
  colours,
  penSizes,
  setPenSizes,
  setColours,
  bgPattern,
  setBgPattern
}: {
  selected: string;
  setSelected: (v: string) => void;
  setColour: (v: string) => void;
  colour: string;
  colours: string[];
  penSizes: number[];
  setPenSizes: React.Dispatch<React.SetStateAction<number[]>>;
  setColours: React.Dispatch<React.SetStateAction<string[]>>;
  bgPattern: string | null;
  setBgPattern: (v: string | null) => void
}) {
  const [newColour, setNewColour] = useState<string>("#ffffff");

  return (
    <div className=" absolute top-4 left-1/2 -translate-x-1/2 z-30 min-h-15 border border-stone-500 w-auto rounded-lg p-3 bg-stone-700 flex ">
      <div
        className={`mx-2 ${selected === "mouse"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          } border w-fit p-2 rounded-md text-stone-300`}
        onClick={() => setSelected("mouse")}
      >
        <FaMousePointer />
      </div>
      <div
        className={`mx-2 ${selected === "text"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          } border w-fit p-2 rounded-md  text-stone-300`}
        onClick={() => setSelected("text")}
      >
        <FaICursor />
      </div>
      <div
        className={`mx-2 ${selected === "pan"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          } border w-fit p-2 rounded-md  text-stone-300`}
        onClick={() => setSelected("pan")}
      >
        <FaHandPaper />
      </div>
      <div className="border mx-3 border-stone-300 h-8"></div>
      <div
        className={`mx-2 ${selected === "eraser"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          } border w-fit p-2 rounded-md  text-stone-300`}
        onClick={() => setSelected("eraser")}
      >
        <FaEraser />
      </div>
      {colours.map((c, i) => (
        <ColourOption
          colour={colour}
          setColour={setColour}
          c={c}
          key={i}
          selected={selected}
          setSelected={setSelected}
          penSizes={penSizes}
          setPenSizes={setPenSizes}
          index={i}
          colours={colours}
          setColours={setColours}
        />
      ))}
      <div
        className={`mx-2 relative inline-block ${selected === "add"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          } border w-fit p-2 rounded-full  text-stone-300`}
        onClick={() => setSelected("add")}
      >
        <FaPlus />
        <div
          className={`${selected === "add" ? "absolute" : "hidden"
            } left-1/2 -translate-x-1/2 top-[150%] bg-stone-700 border border-stone-500 p-2 rounded-lg flex flex-col`}
        >
          <HexColorPicker color={newColour} onChange={setNewColour} />
          <button
            className="p-2 border bg-stone-800 border-stone-600 hover:bg-stone-900 cusor-pointer my-2 rounded-md transition-all! ease-in-out duration-300"
            onClick={(e) => {
              e.stopPropagation();
              setColours((prev) => [...prev, newColour]);
              setPenSizes((prev) => [...prev, 4]);
              setColour(newColour);
              setSelected("pen");
            }}
          >
            Add Colour
          </button>
        </div>
      </div>
      <div className="border mx-3 border-stone-300 h-8"></div>
      <div
        className={`mx-2 relative inline-block border p-2 text-stone-300 rounded-md ${selected === "more"
          ? "border-stone-300 bg-stone-300/20"
          : "border-transparent"
          }`}
        onClick={() => setSelected("more")}
      >
        <BsThreeDots />
        <div
          className={`${selected === "more" ? "absolute" : "hidden"
            } bg-stone-700 border border-stone-500 rounded-lg p-2 top-12 w-60`}
        >
          <div className="flex justify-evenly">
            <div
              className={`border border-stone-300 rounded-md ${bgPattern === "dots" ? "bg-stone-300/20" : ""}`}
              onClick={() => {
                if (bgPattern !== "dots") {
                  setBgPattern("dots")
                } else if (bgPattern === "dots") {
                  setBgPattern(null)
                }
              }
              }
            >
              <svg style={{
                width: "60px",
                height: "60px",
              }}>
                <defs>
                  <pattern
                    id="toolbar-dots"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx="10.5"
                      cy="10.5"
                      r="1"
                      fill="rgba(255, 255, 255, 50%)"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#toolbar-dots)" />
              </svg>
            </div>
            <div
              className={`border border-stone-300 rounded-md ${bgPattern === "smallGrid" ? "bg-stone-300/20" : ""}`}
              onClick={() => {
                if (bgPattern !== "smallGrid") {
                  setBgPattern("smallGrid")
                } else if (bgPattern === "smallGrid") {
                  setBgPattern(null)
                }
              }
              }
            >
              <svg style={{
                width: "60px",
                height: "60px",
              }}>
                <defs>
                  <pattern
                    id="toolbar-smallGrid"
                    height="20"
                    width="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(255, 255, 255, 50%)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#toolbar-smallGrid)" />
              </svg>
            </div>
            <div
              className={`border border-stone-300 rounded-md ${bgPattern === "mediumGrid" ? "bg-stone-300/20" : ""}`}
              onClick={() => {
                if (bgPattern !== "mediumGrid") {
                  setBgPattern("mediumGrid")
                } else if (bgPattern === "mediumGrid") {
                  setBgPattern(null)
                }
              }
              }
            >
              <svg style={{
                width: "60px",
                height: "60px",
              }}>
                <defs>
                  <pattern
                    id="toolbar-mediumGrid"
                    width="30"
                    height="30"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 30 0 L 0 0 0 30"
                      fill="none"
                      stroke="rgba(255, 255, 255, 50%)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#toolbar-mediumGrid)" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Toolbar;
