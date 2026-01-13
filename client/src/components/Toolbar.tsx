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
  palmRejec,
  setPalmRejec,
}: {
  selected: string;
  setSelected: (v: string) => void;
  setColour: (v: string) => void;
  colour: string;
  colours: string[];
  penSizes: number[];
  setPenSizes: React.Dispatch<React.SetStateAction<number[]>>;
  setColours: React.Dispatch<React.SetStateAction<string[]>>;
  palmRejec: { x: number; y: number; width: number; height: number } | null;
  setPalmRejec: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>
  >;
}) {
  const [newColour, setNewColour] = useState<string>("#ffffff");

  return (
    <div className=" absolute top-4 left-1/2 -translate-x-1/2 z-30 min-h-15 border border-stone-500 w-auto rounded-lg p-3 bg-stone-700 flex ">
      <div
        className={`mx-2 ${
          selected === "mouse"
            ? "border-stone-300 bg-stone-300/20"
            : "border-transparent"
        } border w-fit p-2 rounded-md text-stone-300`}
        onClick={() => setSelected("mouse")}
      >
        <FaMousePointer />
      </div>
      <div
        className={`mx-2 ${
          selected === "text"
            ? "border-stone-300 bg-stone-300/20"
            : "border-transparent"
        } border w-fit p-2 rounded-md  text-stone-300`}
        onClick={() => setSelected("text")}
      >
        <FaICursor />
      </div>
      <div
        className={`mx-2 ${
          selected === "pan"
            ? "border-stone-300 bg-stone-300/20"
            : "border-transparent"
        } border w-fit p-2 rounded-md  text-stone-300`}
        onClick={() => setSelected("pan")}
      >
        <FaHandPaper />
      </div>
      <div className="border mx-3 border-stone-300 h-8"></div>
      <div
        className={`mx-2 ${
          selected === "eraser"
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
        className={`mx-2 relative inline-block ${
          selected === "add"
            ? "border-stone-300 bg-stone-300/20"
            : "border-transparent"
        } border w-fit p-2 rounded-full  text-stone-300`}
        onClick={() => setSelected("add")}
      >
        <FaPlus />
        <div
          className={`${
            selected === "add" ? "absolute" : "hidden"
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
        className={`mx-2 relative inline-block border p-2 text-stone-300 rounded-md ${
          selected === "more"
            ? "border-stone-300 bg-stone-300/20"
            : "border-transparent"
        }`}
        onClick={() => setSelected("more")}
      >
        <BsThreeDots />
        <div
          className={`${
            selected === "more" ? "absolute" : "hidden"
          } bg-stone-700 border border-stone-500 rounded-lg p-3 top-12 w-60`}
        >
          <div
            className={`border ${
              palmRejec
                ? "border-stone-300 bg-stone-300/20"
                : "border-transparent"
            } p-3 rounded-md`}
            onClick={() => {
              if (palmRejec) {
                setPalmRejec(null);
              } else {
                setPalmRejec({ x: 200, y: 200, width: 200, height: 200 });
              }
            }}
          >
            Palm Rejection window
          </div>
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
