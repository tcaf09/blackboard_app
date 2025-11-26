import { useEffect, useRef, useState } from "react";
import {
  FaAngleUp,
  FaRegUser,
  FaRegFolder,
  FaRegStickyNote,
  FaPlus,
  FaRegTrashAlt,
} from "react-icons/fa";
import { MdMenu } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import NewMiniMenu from "./NewMiniMenu";
import { createPortal } from "react-dom";

type Note = {
  _id: string;
  name: string;
  folderId: string | null;
  thumbnailUrl: string;
};

type Folder = {
  _id: string;
  name: string;
  parentId: string | null;
};

function NoteItem({
  setDeleteType,
  setToDelete,
  setDeleteMenuShown,
  note,
}: {
  setDeleteType: (v: "note" | "folder") => void;
  setToDelete: (v: Note | Folder) => void;
  setDeleteMenuShown: (v: boolean) => void;
  note: Note;
}) {
  const navigate = useNavigate();
  const [noteHover, setNoteHover] = useState<boolean>(false);
  return (
    <div
      className="flex gap-2 cursor-pointer my-1 py-2"
      onClick={() => navigate(`/note/${note._id}`)}
      onMouseEnter={() => setNoteHover(true)}
      onMouseLeave={() => setNoteHover(false)}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          setDeleteType("note");
          setToDelete(note);
          setDeleteMenuShown(true);
        }}
      >
        <FaRegTrashAlt
          className={`my-1  ${noteHover ? "text-red-500" : "text-transparent"}`}
        />
      </div>
      <FaRegStickyNote className="my-1 shrink-0" />
      <p className="cursor-pointer">{note.name}</p>
    </div>
  );
}

function Folder({
  folder,
  notes,
  folders,
  setNewNoteMenuShown,
  setMenuType,
  setDeleteType,
  setToDelete,
  setDeleteMenuShown,
  setParentFolder,
}: {
  folder: Folder;
  notes: Note[];
  folders: Folder[];
  setNewNoteMenuShown: (v: boolean) => void;
  setMenuType: (v: "Folder" | "Note") => void;
  setDeleteType: (v: "note" | "folder") => void;
  setToDelete: (v: Note | Folder) => void;
  setDeleteMenuShown: (v: boolean) => void;
  setParentFolder: (v: Folder | null) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [hover, setHover] = useState<boolean>(false);
  const [showNewMenu, setShowNewMenu] = useState<boolean>(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom, left: rect.left });
    }
  }, [showNewMenu]);

  return (
    <>
      <div
        className="flex justify-between cursor-pointer my-1"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div className="flex gap-2">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setDeleteType("folder");
              setToDelete(folder);
              setDeleteMenuShown(true);
            }}
          >
            <FaRegTrashAlt
              className={`my-1  ${hover ? "text-red-500" : "text-transparent"}`}
            />
          </div>
          <FaRegFolder className="my-1" />
          <p>{folder.name}</p>
        </div>
        <div className="flex relative gap-2">
          <div
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setParentFolder(folder);
              setShowNewMenu((prev) => !prev);
            }}
            className="z-50"
          >
            <FaPlus
              className={`my-2 pointer-events-none ${
                hover || showNewMenu ? "text-stone-400" : "text-transparent"
              }`}
            />
          </div>
          {showNewMenu &&
            createPortal(
              <div
                style={{
                  position: "fixed",
                  top: menuPos.top,
                  left: menuPos.left,
                }}
              >
                <NewMiniMenu
                  setShowNewMenu={setShowNewMenu}
                  setNewNoteMenuShown={setNewNoteMenuShown}
                  setMenuType={setMenuType}
                />
              </div>,
              document.body
            )}
          <FaAngleUp
            className="my-2"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "all 0.15s ease-in-out",
            }}
          />
        </div>
      </div>
      <div
        className={`${
          open ? "h-auto overflow-visible" : "h-0 overflow-hidden"
        }  ml-4`}
      >
        {notes.map((note, i) => {
          if (note.folderId === folder._id) {
            return (
              <NoteItem
                setDeleteType={setDeleteType}
                setToDelete={setToDelete}
                setDeleteMenuShown={setDeleteMenuShown}
                note={note}
                key={i}
              />
            );
          }
          return null;
        })}
        {folders.map((f, i) => {
          if (f.parentId === folder._id) {
            return (
              <Folder
                folder={f}
                key={i}
                notes={notes}
                folders={folders}
                setDeleteMenuShown={setDeleteMenuShown}
                setMenuType={setMenuType}
                setToDelete={setToDelete}
                setDeleteType={setDeleteType}
                setParentFolder={setParentFolder}
                setNewNoteMenuShown={setNewNoteMenuShown}
              />
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

function SidePanel({
  username,
  folders,
  notes,
  setNewNoteMenuShown,
  setMenuType,
  setDeleteType,
  setToDelete,
  setDeleteMenuShown,
  setParentFolder,
}: {
  username: string;
  folders: Folder[];
  notes: Note[];
  setNewNoteMenuShown: (v: boolean) => void;
  setMenuType: (v: "Folder" | "Note") => void;
  setDeleteType: (v: "note" | "folder") => void;
  setToDelete: (v: Note | Folder) => void;
  setDeleteMenuShown: (v: boolean) => void;
  setParentFolder: (v: Folder | null) => void;
}) {
  const [toggled, setToggled] = useState<boolean>(false);

  return (
    <div
      className={`h-screen w-80 fixed ${
        toggled ? "left-0" : "-left-67"
      } top-0 w-60 bg-stone-900 rounded-r-3xl text-stone-300 border border-stone-700 shadow-md shadow-stone-950`}
      style={{
        transition: "all 0.3s ease-in-out",
      }}
    >
      <MdMenu
        className="float-right m-3 text-3xl cursor-pointer"
        onClick={() => setToggled(!toggled)}
      />
      <div className="flex my-4 mx-2 text-xl">
        <FaRegUser className="my-1 mx-2" />
        <p>{username}</p>
      </div>
      <div className={`mr-12 ml-3 text-lg ${!toggled ? "hidden" : ""}`}>
        <p className="text-stone-400 my-3">Notes</p>
        <div className="overflow-scroll max-h-[calc(100vh-var(--spacing)*25)]">
          {notes.map((note, i) => {
            if (note.folderId === null) {
              return (
                <NoteItem
                  setDeleteType={setDeleteType}
                  setToDelete={setToDelete}
                  setDeleteMenuShown={setDeleteMenuShown}
                  note={note}
                  key={i}
                />
              );
            }
          })}
          {folders.map((folder, i) => {
            if (folder.parentId === null) {
              return (
                <Folder
                  folder={folder}
                  key={i}
                  notes={notes}
                  folders={folders}
                  setNewNoteMenuShown={setNewNoteMenuShown}
                  setParentFolder={setParentFolder}
                  setDeleteType={setDeleteType}
                  setToDelete={setToDelete}
                  setMenuType={setMenuType}
                  setDeleteMenuShown={setDeleteMenuShown}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export default SidePanel;
