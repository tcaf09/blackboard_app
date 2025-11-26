import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FaAngleUp, FaRegFolder } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FaXmark } from "react-icons/fa6";
import axios from "axios";

type Folder = {
  _id: string | null;
  name: string;
  parentId: string | null;
};

interface UserResults {
  _id: string;
  username: string;
  email: string;
}

function NewNoteMenu({
  folders,
  setShown,
  loadNotes,
  loadFolders,
  authToken,
  type,
  setType,
  parentFolder,
}: {
  folders: Folder[];
  setShown: (v: boolean) => void;
  loadNotes: () => Promise<void>;
  loadFolders: () => Promise<void>;
  authToken: string;
  type: "Note" | "Folder";
  setType: (v: "Note" | "Folder") => void;
  parentFolder: Folder | null;
}) {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(
    parentFolder
  );

  const [searchResults, setSearchResults] = useState<UserResults[]>([]);
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const userRef = useRef<HTMLInputElement>(null);
  const [searchedUser, setSearchedUser] = useState<string>("");
  const [users, setUsers] = useState<{ username: string; _id: string }[]>([]);

  const navigate = useNavigate();

  const root: Folder = {
    _id: null,
    name: "Root",
    parentId: null,
  };

  const handleUserChange = (e: ChangeEvent) => {
    if (userRef.current) {
      setSearchedUser((e.target as HTMLInputElement).value);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      axios
        .get(
          `${import.meta.env.VITE_API_URL}/api/users/search?q=${searchedUser}`,
          {
            headers: {
              Authorization: "Bearer " + authToken,
              "Content-Type": "application/json",
            },
          }
        )
        .then((res) => {
          setSearchResults(res.data);
          console.log(searchResults);
        });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [searchedUser]);

  async function addNote() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notes`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nameRef.current ? nameRef.current.value : "",
          folderId: selectedFolder?._id,
          userIds: users.map((user) => user._id),
        }),
      });

      if (!res.ok) throw new Error("Error adding note");
      const data = await res.json();
      return data.insertedId;
    } catch (err) {
      console.log(err);
    }
  }

  async function addFolder() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/folders`, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nameRef.current?.value,
          parentId: selectedFolder?._id,
        }),
      });

      if (!res.ok) throw new Error("Error adding folder");
    } catch (err) {
      console.log(err);
    }
  }

  const FolderComponent = ({
    folder,
    depth = 0,
  }: {
    folder: Folder;
    depth?: number;
  }) => {
    const options = folders.filter((opt) => opt.parentId === folder._id);
    return (
      <>
        <div
          style={{
            paddingLeft: `${16 + depth * 20}px`,
          }}
          onClick={() => setSelectedFolder(folder)}
          className="p-2 cursor-pointer rounded-md hover:bg-stone-700 transition-all! ease-in-out duration-300 flex flex-row"
        >
          <FaRegFolder className="mt-1 mr-2" />
          {folder.name}
        </div>
        {options.map((opt) => (
          <FolderComponent folder={opt} depth={depth + 1} key={opt._id} />
        ))}
      </>
    );
  };

  const Dropdown = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-row cursor-pointer bg-stone-800 text-stone-300 border border-stone-600 rounded-md p-2 w-40 justify-between"
        >
          {selectedFolder?.name || "Select Folder..."}
          <FaAngleUp
            className={`${
              isOpen ? "rotate-180" : "rotate-0"
            } transition-all! duration-150 ease-in-out my-1`}
          />
        </button>
        <div
          className={`bg-stone-800 rounded-md text-stone-300 absolute top-full mt-2 w-52 ${
            !isOpen ? "max-h-0" : "max-h-45 border border-stone-600 "
          } transition-all! duration-300 ease-in-out overflow-y-auto`}
        >
          <div
            style={{ paddingLeft: "16px" }}
            onClick={() => setSelectedFolder(root)}
            className="p-2 cursor-pointer rounded-md hover:bg-stone-700 transition-all! duration-300 ease-in-out flex flex-row"
          >
            <FaRegFolder className="mt-1 mr-2" />
            <p>Root</p>
          </div>

          {folders.map((folder) =>
            folder.parentId === null ? (
              <FolderComponent folder={folder} key={folder._id} />
            ) : null
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-10 rounded-2xl w-2/5 bg-stone-900 border border-stone-700 text-lg text-stone-300">
      {!parentFolder && (
        <div className="flex h-12 rounded-full bg-stone-800 border border-stone-600 justify-between w-full p-1 relative">
          <div
            className={`absolute ${
              type === "Folder" ? "left-1" : "left-[calc(50%+0.125rem)]"
            } h-10 rounded-full bg-stone-700  border border-stone-500 text-stone-300 transition-all! duration-300 ease-in-out`}
            style={{
              width: "calc(50% - 0.25rem)",
            }}
          ></div>
          <p
            onClick={() => setType("Folder")}
            className={`cursor-pointer rounded-full z-50 flex-1 text-center ${
              type === "Folder" ? "text-stone-300" : "text-stone-500"
            } py-2`}
          >
            Folder
          </p>
          <p
            className={`cursor-pointer rounded-full flex-1 text-center py-2 z-50 ${
              type === "Note" ? "text-stone-300" : "text-stone-500"
            }`}
            onClick={() => {
              setType("Note");
            }}
          >
            Note
          </p>
        </div>
      )}
      {parentFolder && <h2>{`Create New ${type}`}</h2>}
      <div className="my-2">
        <div className="flex flex-col">
          <label htmlFor="name">{`${type} name: `}</label>
          <input
            type="text"
            id="name"
            className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none "
            ref={nameRef}
          />
        </div>
        <div className="my-5">
          <label htmlFor="users">Users: </label>
          <div>
            {users.map((user, i) => {
              return (
                <div
                  key={i}
                  className="p-2 bg-stone-700 border border-stone-500 inline-block px-4 rounded-lg m-1 my-2"
                >
                  <span className="align-middle">{user.username}</span>
                  <span
                    className="inline-block m-2 my-1 align-middle cursor-pointer"
                    onClick={() => {
                      setUsers((prev) =>
                        prev.filter((u) => u._id !== user._id)
                      );
                    }}
                  >
                    <FaXmark />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="users"
              id="name"
              className="p-2 rounded-lg bg-stone-800 border border-stone-600 focus:border-stone-300 transition-all! ease-in-out duration-300 text-stone-300 focus:outline-none "
              autoComplete="off"
              ref={userRef}
              value={searchedUser}
              onChange={handleUserChange}
              onBlur={() => {
                setSearchFocused(false);
              }}
              onFocus={() => {
                setSearchFocused(true);
              }}
            />
            {searchResults[0] && searchFocused && (
              <div className="bg-stone-950 p-2 rounded-lg absolute top-12 left-0 z-20">
                {searchResults.map((res) => {
                  return (
                    <div
                      className="flex flex-col p-2 rounded-lg hover:bg-stone-900 cursor-pointer transition-all! duration-300 ease-in-out"
                      onMouseDown={() =>
                        setUsers((prev) => [
                          ...prev,
                          { username: res.username, _id: res._id },
                        ])
                      }
                    >
                      <span>{res.username}</span>
                      <span className="text-xs text-stone-500">
                        {res.email}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {!parentFolder && (
          <div className="my-5">
            <label htmlFor="folder">Parent Folder:</label>
            <Dropdown />
          </div>
        )}
        <button
          onClick={async () => {
            if (type === "Note") {
              const noteId = await addNote();
              await loadNotes();
              setShown(false);
              navigate(`/note/${noteId}`);
            } else if (type === "Folder") {
              await addFolder();
              await loadFolders();
              setShown(false);
            }
          }}
          className="bg-stone-700 border border-stone-500 rounded-full w-1/2 p-3 block mx-auto cursor-pointer transition-all! duration-150 ease-in-out hover:bg-stone-600"
        >
          Create
        </button>
      </div>
    </div>
  );
}

export default NewNoteMenu;
