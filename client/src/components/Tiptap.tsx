// src/Tiptap.tsx

import { BubbleMenu } from "@tiptap/react/menus";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FaBold, FaUnderline, FaItalic } from "react-icons/fa";
import { useEffect } from "react";
import Heading from "@tiptap/extension-heading";
import { BulletList, ListItem } from "@tiptap/extension-list";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./tiptap-ui-primitive/dropdown-menu";

type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number | string;
  content: JSONContent;
};

const Tiptap = ({
  selected,
  onChange,
  box,
}: {
  selected: boolean;
  onChange: (id: string, content: JSONContent) => void;
  box: Box;
}) => {
  const editor = useEditor({
    editable: selected,
    onUpdate: ({ editor }) => {
      onChange(box.id, editor.getJSON());
    },
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      BulletList,
      ListItem,
    ], // define your extension array
    editorProps: {
      attributes: {
        class: `prose prose-invert text-stone-300 ${
          selected
            ? "pointer-events-auto select-text"
            : "pointer-events-none select-none"
        } break-words focus:outline-none`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentJSON = editor.getJSON();
    if (JSON.stringify(currentJSON) !== JSON.stringify(box.content)) {
      editor.commands.setContent(box.content);
    }
  }, [editor, box.content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(selected);
    }
  }, [selected, editor]);

  if (!editor) return null;

  return (
    <>
      <BubbleMenu editor={editor} options={{ placement: "bottom", offset: 8 }}>
        <div className="bubble-menu flex p-3 bg-stone-800 border border-stone-600 rounded-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-1 text-xs rounded-full cursor-pointer font-extrabold text-stone-300 hover:bg-stone-700 ">
                Style
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup className="flex flex-col bg-stone-900 p-2 rounded-3xl">
                <DropdownMenuItem asChild>
                  <button
                    className="px-2 py-1 text-xs my-2 rounded-full text-stone-300 hover:bg-stone-700 "
                    onClick={() => editor.chain().focus().setParagraph().run()}
                  >
                    Normal
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="px-2 py-1 text-xs my-2 rounded-full text-stone-300 hover:bg-stone-700 "
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                  >
                    Heading 1
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="px-2 py-1 text-xs my-2 rounded-full text-stone-300 hover:bg-stone-700 "
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    Heading 2
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="px-2 py-1 text-xs my-2 rounded-full text-stone-300 hover:bg-stone-700 "
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                  >
                    Heading 3
                  </button>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="px-2 py-1 text-xs rounded-full text-stone-300 hover:bg-stone-700 "
            type="button"
          >
            <FaBold />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="px-2 py-1 text-xs rounded-full text-stone-300 hover:bg-stone-700 "
            type="button"
          >
            <FaItalic />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className="px-2 py-1 text-xs rounded-full text-stone-300 hover:bg-stone-700 "
            type="button"
          >
            <FaUnderline />
          </button>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />
    </>
  );
};

export default Tiptap;
