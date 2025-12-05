import { forwardRef } from "react";

type ContextMenuProps = {
  pos: { x: number; y: number };
  onDelete: () => void;
};

const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ pos, onDelete }: ContextMenuProps, ref: React.Ref<HTMLDivElement>) => {
    return (
      <div
        className="absolute bg-stone-700 border border-stone-500 text-stone-300 rounded-lg"
        style={{ top: pos.y, left: pos.x }}
        ref={ref}
      >
        <button
          onClick={onDelete}
          className="p-4 rounded-lg hover:bg-stone-600 transition-all! duration-300 ease-in-out cursor-pointer"
        >
          Delete
        </button>
      </div>
    );
  }
);

ContextMenu.displayName = "ContextMenu";

export default ContextMenu;
