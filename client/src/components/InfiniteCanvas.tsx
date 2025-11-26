import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Textbox from "./Textbox";
import ContextMenu from "./ContextMenu";
import { getStroke } from "perfect-freehand";
import { type JSONContent } from "@tiptap/react";
import { v4 as uuid } from "uuid";
import * as htmlToImage from "html-to-image";

const MemoizedPath = React.memo(
  ({ d, fill }: { d: string; fill: string }) => <path d={d} fill={fill} />,
  (prev, next) => prev.d === next.d && prev.fill === next.fill
);

type Pos = {
  x: number;
  y: number;
};

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

type Props = {
  selectedOption: string;
  setSelectedOption: React.Dispatch<React.SetStateAction<string>>;
  colour: string;
  colours: string[];
  penSizes: number[];
  paths: Path[];
  textboxes: Box[];
  setPaths: React.Dispatch<React.SetStateAction<Path[]>>;
  setTextboxes: React.Dispatch<React.SetStateAction<Box[]>>;
  id: string | undefined;
  authToken: string | null;
  isLoading: React.RefObject<boolean>;
  setSaved: React.Dispatch<React.SetStateAction<boolean>>;
};

function InfiniteCanvas({
  selectedOption,
  setSelectedOption,
  colour,
  colours,
  penSizes,
  paths,
  textboxes,
  setPaths,
  setTextboxes,
  id,
  authToken,
  isLoading,
  setSaved,
}: Props) {
  const screenRef = useRef<HTMLDivElement>(null);

  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(1);

  const contextRef = useRef<HTMLDivElement>(null);
  const [contextPos, setContextPos] = useState<Pos | null>(null);
  const [contextTargetIndex, setContextTargetIndex] = useState<string | null>(
    null
  );

  const isPanning = useRef<boolean>(false);
  const panOffset = useRef<Pos>({ x: 0, y: 0 });
  const activePointers = useRef<{
    pointers: { [id: number]: PointerEvent };
    initialDistance?: number;
    initialScale?: number;
  }>({ pointers: {} });

  const [boxesToSave, setBoxesToSave] = useState<Box[]>([]);
  const [boxesToDelete, setBoxesToDelete] = useState<Box[]>([]);

  const [points, setPoints] = useState<[number, number, number][]>([]);
  const [pathsToSave, setPathsToSave] = useState<Path[]>([]);
  const [pathsToDelete, setPathsToDelete] = useState<Path[]>([]);
  const drawing = useRef<boolean>(false);

  const saving = useRef<boolean>(false);
  const ws = useRef<WebSocket>(null);
  const isRemoteChange = useRef<boolean>(false);

  const strokesCache = useRef<Map<string, string>>(new Map());

  const saveNote = useCallback(
    async (
      pathsToSaveParam: Path[],
      boxesToSaveParam: Box[],
      boxesToDeleteParam: Box[],
      pathsToDeleteParam: Path[]
    ) => {
      try {
        saving.current = true;
        let thumbnailUrl = "";
        if (screenRef.current) {
          thumbnailUrl = await htmlToImage.toJpeg(screenRef.current, {
            quality: 0.5,
            backgroundColor: "#0c0a09",
          });
        }

        if (ws.current) {
          ws.current.send(
            JSON.stringify({
              type: "saveNote",
              noteId: id,
              data: {
                pathsToSave: pathsToSaveParam,
                boxesToSave: boxesToSaveParam,
                pathsToDelete: pathsToDeleteParam,
                boxesToDelete: boxesToDeleteParam,
                thumbnailUrl,
              },
            })
          );
        }

        setPathsToSave((prev) =>
          prev.filter((p) => !pathsToSave.some((sent) => sent.id === p.id))
        );
        setBoxesToSave((prev) =>
          prev.filter((b) => !boxesToSave.some((sent) => sent.id === b.id))
        );
        setBoxesToDelete((prev) =>
          prev.filter((b) => !boxesToDelete.some((sent) => sent.id === b.id))
        );
        setPathsToDelete((prev) =>
          prev.filter((p) => !pathsToDelete.some((sent) => sent.id === p.id))
        );

        setTimeout(() => setSaved(true), 0);
      } catch (err) {
        console.log(err);
      }
    },
    [id, authToken, setSaved]
  );

  function resetGestures(e?: React.PointerEvent) {
    drawing.current = false;

    if (isPanning.current) {
      window.removeEventListener("pointermove", pan);
      window.removeEventListener("pointerup", stopPan);
      isPanning.current = false;
    }
    setPoints([]);

    if (e) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        return;
      }
    }
  }

  const startPan = (e: React.PointerEvent) => {
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as PointerEvent;
    activePointers.current.pointers[nativeEvent.pointerId] = nativeEvent;
    (e.target as HTMLElement).setPointerCapture(nativeEvent.pointerId);

    if (Object.keys(activePointers.current.pointers).length === 1) {
      panOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    } else if (Object.keys(activePointers.current.pointers).length === 2) {
      const [p1, p2] = Object.values(activePointers.current.pointers);
      const initialDistance = Math.hypot(
        p2.clientX - p1.clientX,
        p2.clientY - p1.clientY
      );
      activePointers.current.initialDistance = initialDistance;
      activePointers.current.initialScale = scale;
    }

    isPanning.current = true;
    window.addEventListener("pointermove", pan);
    window.addEventListener("pointerup", stopPan);
  };

  const pan = (e: PointerEvent) => {
    if (!isPanning.current || drawing.current) return;
    activePointers.current.pointers[e.pointerId] = e;
    e.stopPropagation();

    if (Object.keys(activePointers.current.pointers).length === 1) {
      const newX = e.clientX - panOffset.current.x;
      const newY = e.clientY - panOffset.current.y;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const canvasWidth = 5000 * scale;
      const canvasHeight = 5000 * scale;

      const clampedX = Math.min(0, Math.max(newX, viewportWidth - canvasWidth));
      const clampedY = Math.min(
        0,
        Math.max(newY, viewportHeight - canvasHeight)
      );

      setPos({ x: clampedX, y: clampedY });
    } else if (Object.keys(activePointers.current.pointers).length === 2) {
      const [p1, p2] = Object.values(activePointers.current.pointers);
      const currentDistance = Math.hypot(
        p2.clientX - p1.clientX,
        p2.clientY - p1.clientY
      );
      const scaleFactor =
        currentDistance / (activePointers.current.initialDistance || 1);
      const dampingFactor = 0.6;
      const dampedScaleFactor = 1 + (scaleFactor - 1) * dampingFactor;
      setScale(
        Math.min(
          Math.max(
            (activePointers.current.initialScale || 1) * dampedScaleFactor,
            0.3
          ),
          3
        )
      );
    }
  };

  const stopPan = (e: PointerEvent) => {
    delete activePointers.current.pointers[e.pointerId];
    if (Object.keys(activePointers.current.pointers).length === 0) {
      isPanning.current = false;
      window.removeEventListener("pointermove", pan);
      window.removeEventListener("pointerup", stopPan);
    }
    if (Object.keys(activePointers.current.pointers).length < 2) {
      delete activePointers.current.initialDistance;
      delete activePointers.current.initialScale;
    }

    if (e) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const getSvgPathFromStroke = (stroke: number[][]): string => {
    if (!stroke.length) return "";

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ["M", ...stroke[0], "Q"]
    );

    d.push("Z");
    return d.join(" ");
  };

  const options = {
    size: penSizes[colours.indexOf(colour)] * 2,
    smoothing: penSizes[colours.indexOf(colour)] / 32,
    thinning: 0.11,
    streamline: 0.01,
    easing: (t: number) => t,
    start: {
      taper: 0,
      cap: true,
    },
    end: {
      taper: 0,
      cap: true,
    },
  };

  function handlePointerDown(e: React.PointerEvent) {
    if (e.buttons !== 1 || e.pointerType === "touch") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setPoints([
      [(e.clientX - pos.x) / scale, (e.clientY - pos.y) / scale, e.pressure],
    ]);
    drawing.current = true;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1 || e.pointerType === "touch") return;
    setPoints((prev) => [
      ...prev,
      [(e.clientX - pos.x) / scale, (e.clientY - pos.y) / scale, e.pressure],
    ]);
  }

  const handlePointerUp = () => {
    const size = penSizes[colours.indexOf(colour)] * 2;
    const pathId = crypto.randomUUID();
    setPaths((prev) => {
      const newPaths = [
        ...prev,
        { id: pathId, colour: colour, points: points, size: size },
      ];
      return newPaths;
    });
    setPathsToSave((prev) => {
      const newPaths = [
        ...prev,
        { id: pathId, colour: colour, points: points, size: size },
      ];
      return newPaths;
    });
    setPoints([]);
    drawing.current = false;
  };

  function handleEraserMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;

    const x = (e.clientX - pos.x) / scale;
    const y = (e.clientY - pos.y) / scale;

    const deletedPaths: Path[] = [];
    const remainingPaths: Path[] = [];

    paths.forEach((p) => {
      const isHit = p.points.some(([px, py]) => {
        const dx = px - x;
        const dy = py - y;
        return Math.sqrt(dx * dx + dy * dy) < 5; // 20px eraser radius
      });
      if (isHit) {
        deletedPaths.push(p);
      } else {
        remainingPaths.push(p);
      }
    });

    setPaths(remainingPaths);
    setPathsToDelete((prev) => [...prev, ...deletedPaths]);
  }

  const handleContextMenu = (e: React.MouseEvent, index: string) => {
    e.stopPropagation();
    e.preventDefault();
    setContextPos({
      x: (e.clientX - pos.x) / scale,
      y: (e.clientY - pos.y) / scale,
    });
    setContextTargetIndex(index);
  };

  const deleteTextbox = () => {
    if (contextTargetIndex !== null) {
      setTextboxes((prev) => prev.filter((b) => b.id !== contextTargetIndex));
      setBoxesToDelete((prev) => {
        const box = textboxes.find((b) => b.id === contextTargetIndex);
        if (box) {
          return [...prev, box];
        } else {
          return prev;
        }
      });
      setContextPos(null);
      setContextTargetIndex(null);
    }
  };

  const addTextbox = (e: React.MouseEvent) => {
    const posx = (e.clientX - 50) / scale;
    const posy = e.clientY / scale;
    const id = uuid();
    const newBox: Box = {
      id,
      x: posx - pos.x,
      y: posy - pos.y,
      width: 100,
      height: "auto",
      content: { type: "doc", content: [] },
    };

    setTextboxes((prev) => [...prev, newBox]);
    setBoxesToSave((prev) => [...prev, newBox]);
    setSelectedOption("mouse");
  };

  function updateBoxContent(id: string, content: JSONContent) {
    if (isLoading.current) return;
    setTextboxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, content: content } : box))
    );
    setBoxesToSave((prev) => {
      const exists = prev.find((b) => b.id === id);
      if (exists) {
        return prev.map((box) =>
          box.id === id ? { ...box, content: content } : box
        );
      } else {
        const fullBox = textboxes.find((b) => b.id === id);
        if (!fullBox) return prev;

        return [...prev, { ...fullBox, content }];
      }
    });
  }

  const renderedPaths = useMemo(() => {
    return paths.map((path) => {
      if (!strokesCache.current.has(path.id)) {
        const options = {
          size: path.size,
          smoothing: path.size / 32,
          thinning: 0.11,
          streamline: 0.01,
          easing: (t: number) => t,
          start: { taper: 0, cap: true },
          end: { taper: 0, cap: true },
        };
        const stroke = getStroke(path.points, options);
        const pathD = getSvgPathFromStroke(stroke);
        strokesCache.current.set(path.id, pathD);
      }
      const pathD = strokesCache.current.get(path.id);
      return { id: path.id, pathD: pathD || "", colour: path.colour };
    });
  }, [paths]);

  useEffect(() => {
    ws.current = new WebSocket(
      `${import.meta.env.VITE_WS_URL}?token=${authToken}`
    );
    ws.current.onopen = () => {
      if (ws.current) {
        ws.current.send(JSON.stringify({ type: "joinNote", noteId: id }));
      }
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "error") {
        throw new Error(msg.message);
      } else if (msg.type === "noteSaved" && saving.current === true) {
        saving.current = false;
      } else if (msg.type === "noteUpdate") {
        isRemoteChange.current = true;
        console.log(msg.note);
        setPaths((prev) => {
          const combined = [...prev, ...msg.note.pathsToSave];
          const filtered = combined.filter(
            (p) => !msg.note.pathsToDelete.some((x: Path) => x.id === p.id)
          );
          return filtered;
        });

        let boxesToAdd = [];
        let boxesToChange = [];
        for (const box of msg.note.boxesToSave) {
          const exists = textboxes.find((b) => box.id === b.id);
          if (exists) {
            boxesToChange.push(box);
          } else {
            boxesToAdd.push(box);
          }
        }

        setTextboxes((prev) => {
          let updated = [...prev];

          for (const incoming of msg.note.boxesToSave) {
            const existingIndex = updated.findIndex(
              (box) => box.id === incoming.id
            );
            if (existingIndex === -1) {
              updated.push(incoming);
            } else {
              updated[existingIndex] = incoming;
            }
          }

          const idsToDelete = new Set(
            msg.note.boxesToDelete.map((b: Box) => b.id)
          );
          updated = updated.filter((b) => !idsToDelete.has(b.id));

          return updated;
        });
        setTimeout(() => {
          isRemoteChange.current = false;
        }, 0);
      }
    };
    function handleClickOutside(e: MouseEvent) {
      if (
        contextRef.current &&
        !contextRef.current.contains(e.target as Node)
      ) {
        setContextPos(null);
        setContextTargetIndex(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading.current || saving.current || isRemoteChange.current) {
      return;
    }

    if (
      pathsToSave.length === 0 &&
      boxesToSave.length === 0 &&
      boxesToDelete.length === 0 &&
      pathsToDelete.length === 0
    ) {
      return;
    }

    setSaved(false);
    const timeout = setTimeout(() => {
      if (!saving.current) {
        saveNote(pathsToSave, boxesToSave, boxesToDelete, pathsToDelete);
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [
    boxesToSave,
    pathsToSave,
    boxesToDelete,
    pathsToDelete,
    saveNote,
    isLoading,
    setSaved,
  ]);

  // ADD: New useEffect after renderedPaths
  useEffect(() => {
    const currentIds = new Set(paths.map((p) => p.id));
    for (const cachedId of strokesCache.current.keys()) {
      if (!currentIds.has(cachedId)) {
        strokesCache.current.delete(cachedId);
      }
    }
  }, [paths]);

  const currentStroke = useMemo(() => {
    if (points.length === 0) return "";
    const stroke = getStroke(points, options);
    return getSvgPathFromStroke(stroke);
  }, [points, options.size, options.smoothing]);

  return (
    <div
      className={`${
        selectedOption === "text" ? "cursor-text" : ""
      } w-screen h-screen overflow-hidden`}
      ref={screenRef}
    >
      <div
        className="relative"
        style={{
          width: 5000,
          height: 5000,
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "top left",
          touchAction: "none",
        }}
        onClick={(e) => {
          if (selectedOption === "text") {
            addTextbox(e);
          }
        }}
        onPointerDown={(e) => {
          if (selectedOption === "pan") {
            startPan(e);
          }
        }}
      >
        {textboxes.map((box) => (
          <Textbox
            key={box.id}
            props={box}
            handleContextMenu={(e) => handleContextMenu(e, box.id)}
            onChange={updateBoxContent}
            onResize={(id, updates) => {
              if (isLoading.current) return;
              setTextboxes((prev) =>
                prev.map((box) =>
                  box.id === id ? { ...box, ...updates } : box
                )
              );
              setBoxesToSave((prev) => {
                const exists = prev.find((box) => box.id === id);
                if (exists) {
                  return prev.map((box) =>
                    box.id === id ? { ...box, ...updates } : box
                  );
                } else {
                  const existingBox = textboxes.find((box) => box.id === id);
                  if (existingBox) {
                    return [...prev, { ...existingBox, ...updates }];
                  } else {
                    return prev;
                  }
                }
              });
            }}
            panPos={pos}
          />
        ))}
        {contextPos && (
          <ContextMenu
            pos={contextPos}
            ref={contextRef}
            onDelete={deleteTextbox}
          />
        )}
        <svg
          onPointerDown={(e) => {
            if (e.pointerType === "pen" && selectedOption !== "eraser") {
              resetGestures(e);
              setSelectedOption("pen");
              handlePointerDown(e);
            } else if (selectedOption === "pen" && e.pointerType === "mouse") {
              resetGestures(e);
              handlePointerDown(e);
            } else if (e.pointerType === "touch") {
              resetGestures(e);
              setSelectedOption("pan");
              startPan(e);
            }
          }}
          onPointerMove={(e) => {
            if (selectedOption === "pen" && drawing.current) {
              handlePointerMove(e);
            } else if (selectedOption === "eraser") {
              handleEraserMove(e);
            }
          }}
          onPointerUp={(e) => {
            if (selectedOption === "pen" && drawing.current) {
              handlePointerUp();
            }
            resetGestures(e);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            touchAction: "none",
            pointerEvents: selectedOption === "mouse" ? "none" : "auto",
          }}
        >
          {drawing.current && currentStroke && (
            <path d={currentStroke} fill={colour} />
          )}
          {renderedPaths.map((path) => (
            <MemoizedPath key={path.id} d={path.pathD} fill={path.colour} />
          ))}
        </svg>
      </div>
    </div>
  );
}

export default InfiniteCanvas;
