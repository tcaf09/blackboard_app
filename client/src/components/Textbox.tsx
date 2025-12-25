import { useEffect, useRef, useState } from "react";
import Tiptap from "./Tiptap";
import { type JSONContent } from "@tiptap/react";

type Position = [number, number];

type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number | "auto";
  content: JSONContent;
};

type TextboxProps = {
  props: Box;
  handleContextMenu: (e: React.MouseEvent) => void;
  onChange: (id: string, content: JSONContent) => void;
  onResize: (id: string, update: Partial<Box>) => void;
  onClick: (e: React.MouseEvent) => void;
  panPos: { x: number; y: number };
  selectedBoxes: string[],
  allBoxes: Box[]
  setAllBoxes: React.Dispatch<React.SetStateAction<Box[]>>
  scale: number
};

function Textbox({
  props,
  handleContextMenu,
  onChange,
  onResize,
  onClick,
  panPos,
  selectedBoxes,
  allBoxes,
  setAllBoxes,
  scale
}: TextboxProps) {
  const [box, setBox] = useState<Box>(props);

  const isDraging = useRef(false);
  const dragStart = useRef<Position>([0, 0])
  const initialPositions = useRef<Map<string, Position>>(new Map())
  const boxRef = useRef<HTMLDivElement>(null);
  const resizeHandle = useRef<null | string>(null);

  useEffect(() => {
    setBox(props)
  }, [props])

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();

    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);

    initialPositions.current = new Map(
      allBoxes
        .filter(b => selectedBoxes.includes(b.id))
        .map(b => [b.id, [b.x, b.y]])
    )

    isDraging.current = true;
    dragStart.current = [
      (e.clientX - panPos.x) / scale,
      (e.clientY - panPos.y) / scale,
    ];
  };

  const drag = (e: PointerEvent) => {
    if (!isDraging.current) return;
    const currentX = (e.clientX - panPos.x) / scale
    const currentY = (e.clientY - panPos.y) / scale
    const dx = currentX - dragStart.current[0]
    const dy = currentY - dragStart.current[1]

    setAllBoxes(prev => prev.map(b => {
      if (!selectedBoxes.includes(b.id)) return b;

      const initialPos = initialPositions.current.get(b.id)
      if (!initialPos) return b
      return {
        ...b,
        x: initialPos[0] + dx,
        y: initialPos[1] + dy,
      }
    }))
  };

  const stopDrag = () => {
    isDraging.current = false;

    window.removeEventListener("pointermove", drag);
    window.removeEventListener("pointerup", stopDrag);

    setAllBoxes(prev => {
      prev.map(b => {
        if (selectedBoxes.includes(b.id)) {
          onResize(b.id, { x: b.x, y: b.y })
        }
      })
      return prev
    })
  };

  const startResize = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    resizeHandle.current = handle;
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", stopResize);
  };

  const stopResize = () => {
    resizeHandle.current = null;
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stopResize);
    setBox((prev) => {
      onResize(prev.id, {
        width: prev.width,
        height: prev.height,
        x: prev.x,
        y: prev.y,
      });

      return prev;
    });
  };

  const resize = (e: PointerEvent) => {
    if (!resizeHandle.current) return;
    setBox((prev) => {
      let { x, y, width, height } = prev;

      switch (resizeHandle.current) {
        case "bottom":
          height = e.clientY - panPos.y - y;
          break;

        case "right":
          width = e.clientX - panPos.x - x;
          break;

        case "left":
          width = width + (x - (e.clientX - panPos.x));
          x = e.clientX - panPos.x;
          break;

        case "bottomRight":
          width = e.clientX - panPos.x - x;
          height = e.clientY - panPos.y - y;
          break;

        case "bottomLeft":
          width = width + (x - (e.clientX - panPos.x));
          height = e.clientY - panPos.y - y;
          x = e.clientX - panPos.x;
          break;

        case "topRight":
          height = (height as number) + (y - (e.clientY - panPos.y));
          width = e.clientX - panPos.x - x;
          y = e.clientY - panPos.y;
          break;

        case "topLeft":
          width = width + (x - (e.clientX - panPos.x));
          height = (height as number) + (y - (e.clientY - panPos.y));
          y = e.clientY - panPos.y;
          x = e.clientX - panPos.x;
          break;
      }

      return { ...prev, x, y, width, height };
    });
  };

  return (
    <div
      className={`absolute border-2 border-t-8 ${selectedBoxes.includes(box.id) ? "border-stone-700" : "border-transparent"
        } hover:border-stone-700`}
      style={{
        left: box.x,
        top: box.y,
        minHeight: box.height,
        width: box.width,
        height: "auto",
      }}
      onContextMenu={handleContextMenu}
      onClick={(e) => onClick(e)}
      ref={boxRef}
    >
      <div
        className="absolute w-[80%] h-2 left-[10%] -top-2 hover:cursor-grab"
        onPointerDown={startDrag}
      ></div>
      <div
        className="absolute w-[80%] h-1 left-[10%] -bottom-0.5 hover:cursor-ns-resize"
        onPointerDown={(e) => startResize("bottom", e)}
      ></div>
      <div
        className="absolute h-[80%] w-1 top-[10%] -left-0.5 hover:cursor-ew-resize"
        onPointerDown={(e) => startResize("left", e)}
      ></div>
      <div
        className="absolute h-[80%] w-1 top-[10%] -right-0.5 hover:cursor-ew-resize"
        onPointerDown={(e) => startResize("right", e)}
      ></div>

      <div
        className="absolute w-2 h-2 -top-1 -left-1 hover:cursor-nwse-resize"
        onPointerDown={(e) => startResize("topLeft", e)}
      ></div>
      <div
        className="absolute w-2 h-2 -top-1 -right-1 hover:cursor-nesw-resize"
        onPointerDown={(e) => startResize("topRight", e)}
      ></div>
      <div
        className="absolute w-2 h-2 -bottom-1 -left-1 hover:cursor-nesw-resize"
        onPointerDown={(e) => startResize("bottomLeft", e)}
      ></div>
      <div
        className="absolute w-2 h-2 -bottom-1 -right-1 hover:cursor-nwse-resize"
        onPointerDown={(e) => startResize("bottomRight", e)}
      ></div>
      <Tiptap selected={selectedBoxes.includes(box.id)} onChange={onChange} box={box} />
    </div>
  );
}

export default Textbox;
