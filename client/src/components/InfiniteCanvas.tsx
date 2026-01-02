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
import PalmRejecWin from "./PalmRejecWin";
import axios from "axios";

const MemoizedPath = React.memo(
  ({ d, fill, selected }: { d: string; fill: string; selected: boolean }) => (
    <path
      d={d}
      fill={fill}
      stroke={selected ? "#ffffff" : "none"}
      strokeWidth={selected ? "4" : "0"}
      strokeDasharray="6 4"
    />
  ),
  (prev, next) =>
    prev.d === next.d &&
    prev.fill === next.fill &&
    prev.selected === next.selected
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
  const [contextType, setContextType] = useState<string>("textbox");

  const isPanning = useRef<boolean>(false);
  const panOffset = useRef<Pos>({ x: 0, y: 0 });
  const activePointers = useRef<{
    pointers: { [id: number]: PointerEvent };
    initialDistance?: number;
    initialScale?: number;
  }>({ pointers: {} });
  const zoomFocus = useRef<Pos>({ x: 0, y: 0 });
  const worldZoomFocus = useRef<Pos>({ x: 0, y: 0 });

  const [boxesToSave, setBoxesToSave] = useState<Box[]>([]);
  const [boxesToDelete, setBoxesToDelete] = useState<Box[]>([]);

  const [points, setPoints] = useState<[number, number, number][]>([]);
  const [pathsToSave, setPathsToSave] = useState<Path[]>([]);
  const [pathsToDelete, setPathsToDelete] = useState<Path[]>([]);
  const initialPositions = useRef<Map<string, [number, number, number][]>>(
    new Map()
  );
  const strokeDragStart = useRef<Pos>({ x: 0, y: 0 });
  const strokeDragging = useRef<boolean>(false);

  const drawing = useRef<boolean>(false);

  const saving = useRef<boolean>(false);
  const ws = useRef<WebSocket>(null);
  const isRemoteChange = useRef<boolean>(false);
  const isDragging = useRef<boolean>(false);

  const strokesCache = useRef<Map<string, string>>(new Map());

  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selecting, setSelecting] = useState<boolean>(false);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [palmRejec, setPalmRejec] = useState<null | {
    x: number;
    y: number;
    width: number;
    height: number;
  }>(null);

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

        await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/notes/${id}`,
          {
            thumbnailUrl,
            paths,
            textboxes,
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        saving.current = false;
        setTimeout(() => setSaved(true), 0);
      } catch (err) {
        console.log(err);
        alert(err);
      }
    },
    [id, authToken, setSaved, paths, textboxes]
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
      const midpoint = {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      };
      const worldMidpoint = {
        x: (midpoint.x - pos.x) / scale,
        y: (midpoint.y - pos.y) / scale,
      };
      worldZoomFocus.current = worldMidpoint;
      zoomFocus.current = midpoint;
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
      const newScale = Math.min(
        Math.max(
          (activePointers.current.initialScale || 1) * dampedScaleFactor,
          0.3
        ),
        3
      );
      setScale(newScale);

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const canvasWidth = 5000 * scale;
      const canvasHeight = 5000 * scale;

      const newX = zoomFocus.current.x - worldZoomFocus.current.x * newScale;
      const newY = zoomFocus.current.y - worldZoomFocus.current.y * newScale;

      const clampedX = Math.min(0, Math.max(newX, viewportWidth - canvasWidth));
      const clampedY = Math.min(
        0,
        Math.max(newY, viewportHeight - canvasHeight)
      );
      setPos({ x: clampedX, y: clampedY });
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
    if (e.buttons !== 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setPoints([
      [(e.clientX - pos.x) / scale, (e.clientY - pos.y) / scale, e.pressure],
    ]);
    drawing.current = true;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
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

  const handleContextMenu = (e: React.MouseEvent, index: string | null) => {
    e.stopPropagation();
    e.preventDefault();
    setContextPos({
      x: (e.clientX - pos.x) / scale,
      y: (e.clientY - pos.y) / scale,
    });
    setContextTargetIndex(index);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    if (e.target === e.currentTarget) {
      setSelectedBoxes([]);
      setSelectedPaths([]);
    }
    if (selectedOption === "text") {
      addTextbox(e);
    }
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

  const handleStrokeDragStart = (e: React.PointerEvent) => {
    if (strokeDragging.current) return;
    strokeDragging.current = true;

    initialPositions.current = new Map(
      paths
        .filter((p) => selectedPaths.includes(p.id))
        .map((p) => [p.id, p.points])
    );

    strokeDragStart.current = {
      x: (e.clientX - pos.x) / scale,
      y: (e.clientY - pos.y) / scale,
    };

    window.addEventListener("pointermove", handleStrokeDrag);
    window.addEventListener("pointerup", handleStrokeDragEnd);
  };

  const handleStrokeDrag = (e: PointerEvent) => {
    if (!strokeDragging.current) return;
    const currentX = (e.clientX - pos.x) / scale;
    const currentY = (e.clientY - pos.y) / scale;
    const dx = currentX - strokeDragStart.current.x;
    const dy = currentY - strokeDragStart.current.y;

    setPaths((prev) =>
      prev.map((p) => {
        if (!selectedPaths.includes(p.id)) return p;

        const initialPos = initialPositions.current.get(p.id);
        if (!initialPos) return p;

        strokesCache.current.delete(p.id);

        return {
          ...p,
          points: initialPos.map(([x, y, pressure]) => [
            x + dx,
            y + dy,
            pressure,
          ]),
        };
      })
    );
  };

  const handleStrokeDragEnd = () => {
    strokeDragging.current = false;
    window.removeEventListener("pointermove", handleStrokeDrag);
    window.removeEventListener("pointerup", handleStrokeDragEnd);

    setPaths((currentPaths) => {
      const movedPaths = currentPaths.filter((p) =>
        selectedPaths.includes(p.id)
      );
      setPathsToSave((prev) => {
        const map = new Map<string, Path>();

        // keep previous
        for (const p of prev) {
          map.set(p.id, p);
        }

        // overwrite moved
        for (const p of movedPaths) {
          map.set(p.id, p);
        }

        return Array.from(map.values());
      });
      return currentPaths;
    });
  };
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

        setPathsToSave([]);
        setPathsToDelete([]);
        setBoxesToSave([]);
        setBoxesToDelete([]);
      } else if (msg.type === "noteUpdate") {
        isRemoteChange.current = true;
        setPaths((prev) => {
          const map = new Map<string, Path>();

          // start with existing
          for (const p of prev) {
            map.set(p.id, p);
          }

          // apply saves (overwrite)
          for (const p of msg.note.pathsToSave) {
            strokesCache.current.delete(p.id);
            map.set(p.id, p);
          }

          // apply deletes
          for (const p of msg.note.pathsToDelete) {
            map.delete(p.id);
          }

          return Array.from(map.values());
        });

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

    const handleKeydown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setScale((prev) => Math.min(Math.max(prev + 0.1, 0.3), 3));
      } else if (isCtrl && e.key === "-") {
        e.preventDefault();
        setScale((prev) => Math.min(Math.max(prev - 0.1, 0.3), 3));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, {
        capture: true,
      });
      window.removeEventListener("keydown", handleKeydown);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading.current || saving.current || isRemoteChange.current) {
      return;
    }

    setSaved(false);
    const timeout = setTimeout(() => {
      if (!saving.current) {
        saveNote(pathsToSave, boxesToSave, boxesToDelete, pathsToDelete);
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, [paths, textboxes, saveNote, isLoading, setSaved]);

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
          handleCanvasClick(e);
        }}
        onContextMenu={(e) => {
          handleContextMenu(e, null);
          setContextType("canvas");
        }}
        onPointerDown={(e) => {
          if (selectedOption === "pan") {
            startPan(e);
          } else if (selectedOption === "mouse" && selectedPaths.length === 0) {
            if (e.target !== e.currentTarget) return;
            resetGestures(e);
            isDragging.current = false;
            const y = (e.clientY - pos.y) / scale;
            const x = (e.clientX - pos.x) / scale;
            setSelecting(true);
            setSelectionEnd({ x, y });
            setSelectionStart({ x, y });
          } else if (selectedOption === "mouse" && selectedPaths.length > 0) {
            handleStrokeDragStart(e);
          }
        }}
        onPointerMove={(e) => {
          if (selectedOption === "mouse" && selecting && selectionStart) {
            isDragging.current = true;
            const y = (e.clientY - pos.y) / scale;
            const x = (e.clientX - pos.x) / scale;
            const hitBoxes = textboxes
              .filter(
                (box) =>
                  box.x < Math.max(x, selectionStart?.x || 0) &&
                  box.x > Math.min(x, selectionStart?.x || 0) &&
                  box.y < Math.max(y, selectionStart?.y || 0) &&
                  box.y > Math.min(y, selectionStart?.y || 0)
              )
              .map((box) => box.id);
            const hitPaths = paths
              .filter((path) =>
                path.points.some(
                  (point) =>
                    point[0] < Math.max(x, selectionStart?.x || 0) &&
                    point[0] > Math.min(x, selectionStart?.x || 0) &&
                    point[1] < Math.max(y, selectionStart?.y || 0) &&
                    point[1] > Math.min(y, selectionStart?.y || 0)
                )
              )
              .map((path) => path.id);
            setSelectedPaths(hitPaths);
            setSelectedBoxes(hitBoxes);
            setSelectionEnd({ x, y });
          }
        }}
        onPointerUp={() => {
          if (selectedOption === "mouse" && selecting) {
            setSelectionStart(null);
            setSelectionEnd(null);
            setSelecting(false);
          }
        }}
      >
        {textboxes.map((box) => (
          <Textbox
            key={box.id}
            props={box}
            handleContextMenu={(e) => {
              handleContextMenu(e, box.id);
              setContextType("textbox");
            }}
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
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setSelectedBoxes([box.id]);
            }}
            selectedBoxes={selectedBoxes}
            allBoxes={textboxes}
            setAllBoxes={setTextboxes}
            scale={scale}
          />
        ))}
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
        {palmRejec && (
          <PalmRejecWin
            win={palmRejec}
            setWin={setPalmRejec}
            selectedOption={selectedOption}
            panPos={pos}
          />
        )}
        <svg
          onPointerDown={(e) => {
            if (selectedOption === "pen") {
              resetGestures(e);
              handlePointerDown(e);
            } else if (selectedOption === "pan") {
              resetGestures(e);
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
          {selecting &&
            selectedOption === "mouse" &&
            selectionStart &&
            selectionEnd && (
              <rect
                x={Math.min(selectionStart.x, selectionEnd.x)}
                y={Math.min(selectionStart.y, selectionEnd.y)}
                width={Math.abs(selectionEnd.x - selectionStart.x)}
                height={Math.abs(selectionEnd.y - selectionStart.y)}
                fill="rgba(255, 255, 255, 0.3)"
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth={2 / scale}
              />
            )}
          {drawing.current && currentStroke && (
            <path d={currentStroke} fill={colour} />
          )}
          {renderedPaths.map((path) => (
            <MemoizedPath
              key={path.id}
              d={path.pathD}
              fill={path.colour}
              selected={selectedPaths.includes(path.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export default InfiniteCanvas;
