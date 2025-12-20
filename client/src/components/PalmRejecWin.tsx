import React, { useRef } from "react"

function PalmRejecWin({
  win,
  setWin,
  selectedOption,
  panPos
}: {
  win: { x: number, y: number, width: number, height: number };
  setWin: React.Dispatch<React.SetStateAction<{ x: number, y: number, width: number, height: number } | null>>;
  selectedOption: string;
  panPos: { x: number, y: number }
}) {
  const isDraging = useRef(false)
  const offset = useRef<[number, number]>([0, 0]);
  const resizeHandle = useRef<null | string>(null)

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();

    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);

    isDraging.current = true;
    offset.current = [
      e.clientX - panPos.x - win.x,
      e.clientY - panPos.y - win.y,
    ];
  };

  const drag = (e: PointerEvent) => {
    if (!isDraging.current) return;
    setWin((prev) => {
      if (!prev) return prev;

      return { ...prev, x: e.clientX - panPos.x - offset.current[0], y: e.clientY - panPos.y - offset.current[1] }
    })
  };

  const stopDrag = () => {
    isDraging.current = false;

    window.removeEventListener("pointermove", drag);
    window.removeEventListener("pointerup", stopDrag);

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
  };

  const resize = (e: PointerEvent) => {
    if (!resizeHandle.current) return;
    setWin((prev) => {
      if (!prev) return prev
      let { x, y, width, height } = prev;

      switch (resizeHandle.current) {
        case "top":
          height = (height as number) + (y - (e.clientY - panPos.y));
          y = e.clientY - panPos.y;
          break
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
      style={{
        position: "fixed",
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        cursor: selectedOption === "mouse" ? "grab" : "default"
      }}
      className="bg-stone-950/50 border border-stone-800 rounded-sm"
      onClick={(e) => {
        if (selectedOption !== "mouse") {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      onMouseDown={(e) => {
        if (selectedOption !== "mouse") {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
      onPointerDown={(e) => {
        if (selectedOption !== "mouse") {
          e.stopPropagation()
          e.preventDefault()
        } else {
          startDrag(e)
        }
      }}
      onContextMenu={(e) => {
        if (selectedOption !== "mouse") {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      <div
        className="absolute w-[80%] h-1 left-[10%] -top-0.5 hover:cursor-ns-resize"
        onPointerDown={(e) => startResize("top", e)}
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
    </div>
  )
}

export default PalmRejecWin
