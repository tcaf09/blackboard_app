import { useEffect, useRef } from "react";

function NewMiniMenu({
  setShowNewMenu,
  setNewNoteMenuShown,
  setMenuType,
}: {
  setShowNewMenu: (v: boolean) => void;
  setNewNoteMenuShown: (v: boolean) => void;
  setMenuType: (v: "Folder" | "Note") => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowNewMenu]);
  return (
    <div
      ref={menuRef}
      className="absolute top-full left-0 w-max bg-stone-700 border border-stone-500 z-50 rounded-lg text-stone-300"
    >
      <div
        className="p-2 px-4 rounded-t-lg hover:bg-stone-600 transition-all! duration-150 ease-in-out cursor-pointer"
        onClick={() => {
          setMenuType("Note");
          setNewNoteMenuShown(true);
          setShowNewMenu(false);
        }}
      >
        <p>New Note</p>
      </div>
      <div
        className="p-2 px-4 rounded-b-lg hover:bg-stone-600 transtion-all! duration-300 ease-in-out cursor-pointer"
        onClick={() => {
          setMenuType("Folder");
          setNewNoteMenuShown(true);
          setShowNewMenu(false);
        }}
      >
        <p>New Folder</p>
      </div>
    </div>
  );
}

export default NewMiniMenu;
