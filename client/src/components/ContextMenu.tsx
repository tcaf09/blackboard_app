import React, { forwardRef } from "react";

type ContextMenuProps = {
  pos: { x: number; y: number };
  onDelete: () => void;
  type: string;
  palmRejec: { x: number, y: number, width: number, height: number } | null
  setPalmRejec: React.Dispatch<React.SetStateAction<{ x: number, y: number, width: number, height: number } | null>>
};

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ pos, onDelete, type, palmRejec, setPalmRejec }: ContextMenuProps, ref: React.Ref<HTMLDivElement>) => {
    return (
      <div
        className="absolute flex flex-col bg-stone-700 border border-stone-500 text-stone-300 rounded-lg z-40"
        style={{ top: pos.y, left: pos.x }}
        ref={ref}
      >
        {type === "textbox" && (
          <button
            onClick={onDelete}
            className="p-4 rounded-lg hover:bg-stone-600 transition-all! duration-300 ease-in-out cursor-pointer"
          >
            Delete
          </button>
        )}
        {type == "canvas" && (
          <button
            className="p-4 rounded-lg hover:bg-stone-600 transition-all! duration-300 ease-in-out cursor-pointer"
            onClick={() => {
              if (!palmRejec) {
                setPalmRejec({ x: pos.x, y: pos.y, width: 200, height: 200 })
              } else {
                setPalmRejec(null)
              }
            }}
          >
            Palm Rejection Window
          </button>
        )}
      </div>
    );
  }
);

ContextMenu.displayName = "ContextMenu";

export default ContextMenu;
