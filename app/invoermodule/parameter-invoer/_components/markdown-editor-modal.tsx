"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";

interface MarkdownEditorModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export function MarkdownEditorModal({
  isOpen,
  title,
  initialValue,
  onClose,
  onSave,
}: MarkdownEditorModalProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({ 
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[220px] p-3 text-xs leading-relaxed text-gray-800 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-1.5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:my-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4",
      },
    },
  });

  useEffect(() => {
    if (editor && isOpen) {
      editor.commands.setContent(initialValue);
    }
  }, [isOpen, initialValue, editor]);

  if (!isOpen) return null;

  const handleInsertLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Voer URL in (bijv. https://voorbeeld.nl):", previousUrl);
    
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleSave = () => {
    if (!editor) return;
    const storage = editor.storage as Record<string, any>;
    const markdownContent = storage.markdown?.getMarkdown() || editor.getText();
    onSave(markdownContent);
    onClose();
  };

  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-gray-100 border-b flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-800">
            Tekst bewerken: <span className="text-blue-600">{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Knoppenbalk */}
        <div className="p-2 bg-gray-50 border-b flex flex-wrap gap-1 items-center">
          {/* Vet & Cursief */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 border rounded text-xs font-bold ${
              editor.isActive("bold") ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Vetgedrukt"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 border rounded text-xs italic ${
              editor.isActive("italic") ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Cursief"
          >
            I
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Koppen */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 border rounded text-xs font-bold ${
              editor.isActive("heading", { level: 1 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Kop 1 (#)"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 border rounded text-xs font-bold ${
              editor.isActive("heading", { level: 2 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Kop 2 (##)"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 border rounded text-xs font-bold ${
              editor.isActive("heading", { level: 3 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Kop 3 (###)"
          >
            H3
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Lijsten */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 border rounded text-xs ${
              editor.isActive("bulletList") ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Opsomming"
          >
            • Lijst
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 border rounded text-xs ${
              editor.isActive("orderedList") ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Genummerde lijst"
          >
            1. Lijst
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Link */}
          <button
            type="button"
            onClick={handleInsertLink}
            className={`px-2 py-1 border rounded text-xs ${
              editor.isActive("link") ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
            title="Hyperlink invoegen"
          >
            🔗 Link
          </button>
        </div>

        {/* Editor Edit Window */}
        <div className="p-3 overflow-y-auto flex-1 bg-white border-b min-h-45">
          <EditorContent editor={editor} />
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-100 font-medium"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
          >
            Opslaan & Toepassen
          </button>
        </div>
      </div>
    </div>
  );
}