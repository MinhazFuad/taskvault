'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';

// ── Types ─────────────────────────────────────────────────────

interface SlashCmd {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  // Each command owns its own delete + apply in one atomic chain
  run: (editor: Editor, from: number, to: number) => void;
}

interface SlashState {
  query: string;
  slashFrom: number;
  x: number;
  y: number;
}

export interface RichEditorProps {
  content?: string;
  onChange?: (json: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
}

// ── Commands — one atomic chain per command ───────────────────

const ALL_CMDS: SlashCmd[] = [
  {
    title: 'Heading 1', description: 'Large section heading', icon: 'H1',
    keywords: ['h1', 'heading', 'title'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2', description: 'Medium section heading', icon: 'H2',
    keywords: ['h2', 'heading', 'subtitle'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3', description: 'Small section heading', icon: 'H3',
    keywords: ['h3', 'heading'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List', description: 'Unordered list of items', icon: '•',
    keywords: ['ul', 'list', 'bullet', 'unordered'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleBulletList().run(),
  },
  {
    title: 'Numbered List', description: 'Ordered list of items', icon: '1.',
    keywords: ['ol', 'list', 'numbered', 'ordered'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleOrderedList().run(),
  },
  {
    title: 'To-do List', description: 'Checkable task items', icon: '☑',
    keywords: ['todo', 'task', 'check', 'checkbox'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleTaskList().run(),
  },
  {
    title: 'Code Block', description: 'Monospace code block', icon: '</>',
    keywords: ['code', 'pre', 'codeblock'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleCodeBlock().run(),
  },
  {
    title: 'Quote', description: 'Indented blockquote', icon: '"',
    keywords: ['quote', 'blockquote', 'cite'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleBlockquote().run(),
  },
  {
    title: 'Divider', description: 'Horizontal separator', icon: '—',
    keywords: ['hr', 'divider', 'separator', 'rule'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).setHorizontalRule().run(),
  },
  {
    title: 'Bold', description: 'Bold text', icon: 'B',
    keywords: ['bold', 'strong'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleBold().run(),
  },
  {
    title: 'Italic', description: 'Italic text', icon: 'I',
    keywords: ['italic', 'em'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleItalic().run(),
  },
  {
    title: 'Strikethrough', description: 'Strike through text', icon: 'S̶',
    keywords: ['strike', 'strikethrough'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleStrike().run(),
  },
  {
    title: 'Inline Code', description: 'Monospace inline snippet', icon: '`',
    keywords: ['code', 'inline', 'mono'],
    run: (e, f, t) => e.chain().focus().deleteRange({ from: f, to: t }).toggleCode().run(),
  },
];

function filterCmds(query: string): SlashCmd[] {
  if (!query) return ALL_CMDS;
  const q = query.toLowerCase();
  return ALL_CMDS.filter(
    c => c.title.toLowerCase().includes(q) || c.keywords.some(k => k.startsWith(q))
  );
}

// ── Utilities ─────────────────────────────────────────────────

export function isRichContentEmpty(json: string): boolean {
  if (!json) return true;
  try {
    const doc = JSON.parse(json);
    const extract = (node: any): string => {
      if (node.type === 'text') return node.text || '';
      if (node.content) return node.content.map(extract).join('');
      return '';
    };
    return !extract(doc).trim();
  } catch {
    return !json.trim();
  }
}

function parseInitialContent(raw?: string): object | string {
  if (!raw) return '';
  try {
    const p = JSON.parse(raw);
    if (p?.type === 'doc') return p;
  } catch {}
  return raw.split('\n').map(l => `<p>${l || '<br>'}</p>`).join('');
}

// ── Slash Menu ────────────────────────────────────────────────

function SlashMenu({
  state, items, selectedIndex, onSelect,
}: {
  state: SlashState;
  items: SlashCmd[];
  selectedIndex: number;
  onSelect: (cmd: SlashCmd) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-sel]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  const approxH   = Math.min(items.length, 8) * 52 + 40;
  const viewH     = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewW     = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const top       = state.y + approxH > viewH - 8 ? state.y - approxH - 4 : state.y + 6;
  const left      = Math.max(8, Math.min(state.x, viewW - 288));

  return createPortal(
    <div
      ref={listRef}
      className="fixed z-[9999] w-72 bg-slate-800 border border-slate-600/70 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      style={{ left, top }}
    >
      <div className="p-1.5 max-h-80 overflow-y-auto space-y-0.5">
        {items.map((cmd, i) => (
          <button
            key={cmd.title}
            data-sel={i === selectedIndex ? '' : undefined}
            onMouseDown={e => { e.preventDefault(); onSelect(cmd); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              i === selectedIndex ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/70'
            }`}
          >
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 font-mono ${
              i === selectedIndex ? 'bg-white/15 text-white' : 'bg-slate-700 text-slate-400'
            }`}>{cmd.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{cmd.title}</p>
              <p className={`text-[10px] truncate mt-0.5 ${i === selectedIndex ? 'text-blue-200' : 'text-slate-500'}`}>{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-slate-700/60 flex items-center gap-3 text-[9px] text-slate-600 font-mono">
        <span>↑↓ navigate</span><span>↵ select</span><span>Esc dismiss</span>
      </div>
    </div>,
    document.body
  );
}

// ── RichEditor ────────────────────────────────────────────────

export default function RichEditor({
  content,
  onChange,
  placeholder = 'Type "/" for commands…',
  readOnly  = false,
  autoFocus = false,
  className = '',
  minHeight = '180px',
}: RichEditorProps) {
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Refs — updated SYNCHRONOUSLY so keyboard extension always has fresh values
  const slashRef    = useRef<SlashState | null>(null);
  const selIdxRef   = useRef(0);
  const editorRef   = useRef<Editor | null>(null);

  // Keep display state refs in sync on every render
  slashRef.current  = slashState;
  selIdxRef.current = selectedIdx;

  // ── Execute a slash command ─────────────────────────────────
  const doExecute = (cmd: SlashCmd, slash: SlashState, editor: Editor) => {
    const to = editor.state.selection.from;
    cmd.run(editor, slash.slashFrom, to);    // atomic: delete + apply in one chain
    // Clear synchronously so keyboard handler doesn't re-fire
    slashRef.current = null;
    setSlashState(null);
    setSelectedIdx(0);
  };

  // ── Keyboard extension ──────────────────────────────────────
  // useMemo so extension class is stable; uses refs for live values
  const keyboardExt = useMemo(() => Extension.create({
    name: 'slashKeyboard',
    addKeyboardShortcuts() {
      return {
        ArrowUp: () => {
          if (!slashRef.current) return false;
          const n = filterCmds(slashRef.current.query).length;
          if (!n) return false;
          setSelectedIdx(i => { const v = (i + n - 1) % n; selIdxRef.current = v; return v; });
          return true;
        },
        ArrowDown: () => {
          if (!slashRef.current) return false;
          const n = filterCmds(slashRef.current.query).length;
          if (!n) return false;
          setSelectedIdx(i => { const v = (i + 1) % n; selIdxRef.current = v; return v; });
          return true;
        },
        Enter: () => {
          const slash = slashRef.current;
          if (!slash) return false;
          const cmds = filterCmds(slash.query);
          const cmd  = cmds[selIdxRef.current];
          if (cmd && editorRef.current) {
            doExecute(cmd, slash, editorRef.current);
            return true;
          }
          // No match — dismiss menu and let StarterKit handle Enter normally
          slashRef.current = null;
          setSlashState(null);
          return false;
        },
        Escape: () => {
          if (!slashRef.current) return false;
          slashRef.current = null;
          setSlashState(null);
          setSelectedIdx(0);
          return true;
        },
      };
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build editor ────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ...(readOnly ? [] : [keyboardExt]),
    ],
    editable: !readOnly,
    content: parseInitialContent(content),
    onUpdate: ({ editor: e }) => {
      if (readOnly) return;

      const { $from } = e.state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

      // Match /command at start of block or after whitespace
      const match = textBefore.match(/(^|[\s])\/(\S*)$/);

      if (match) {
        const query     = match[2];
        const slashFrom = $from.pos - query.length - 1;
        const coords    = e.view.coordsAtPos($from.pos);
        const next: SlashState = { query, slashFrom, x: coords.left, y: coords.bottom };
        // Sync update first so keyboard handler has fresh state before React re-renders
        slashRef.current  = next;
        selIdxRef.current = 0;
        setSlashState(next);
        setSelectedIdx(0);
      } else {
        slashRef.current = null;
        setSlashState(null);
      }

      onChange?.(JSON.stringify(e.getJSON()));
    },
    editorProps: {
      attributes: { class: 'outline-none' },
    },
  });

  // Keep editorRef current
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // Auto-focus (waits for slide-in transition)
  useEffect(() => {
    if (!autoFocus || !editor) return;
    const t = setTimeout(() => editor.commands.focus('end'), 120);
    return () => clearTimeout(t);
  }, [autoFocus, editor]);

  // Sync content prop (e.g. switching modules)
  const prevContent = useRef(content);
  useEffect(() => {
    if (!editor || content === prevContent.current) return;
    prevContent.current = content;
    editor.commands.setContent(parseInitialContent(content) ?? '', false);
  }, [content, editor]);

  const slashItems = slashState ? filterCmds(slashState.query) : [];

  return (
    <>
      <style>{`
        .tv-editor .ProseMirror { outline: none; color: rgb(203 213 225); font-size: 0.875rem; line-height: 1.75; }
        .tv-editor .ProseMirror > * + * { margin-top: 0.3rem; }
        .tv-editor .ProseMirror h1 { font-size: 1.5rem; font-weight: 800; color: white; margin-top: 1.25rem; margin-bottom: 0.3rem; line-height: 1.25; }
        .tv-editor .ProseMirror h2 { font-size: 1.2rem; font-weight: 700; color: white; margin-top: 1rem; margin-bottom: 0.25rem; line-height: 1.3; }
        .tv-editor .ProseMirror h3 { font-size: 1.05rem; font-weight: 700; color: rgb(226 232 240); margin-top: 0.75rem; margin-bottom: 0.2rem; }
        .tv-editor .ProseMirror ul  { list-style: disc;    padding-left: 1.4rem; }
        .tv-editor .ProseMirror ol  { list-style: decimal; padding-left: 1.4rem; }
        .tv-editor .ProseMirror li > p { margin: 0; }
        .tv-editor .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .tv-editor .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; }
        .tv-editor .ProseMirror ul[data-type="taskList"] li > label { margin-top: 0.35rem; flex-shrink: 0; cursor: pointer; }
        .tv-editor .ProseMirror ul[data-type="taskList"] li > label input { width: 14px; height: 14px; accent-color: #3b82f6; cursor: pointer; }
        .tv-editor .ProseMirror ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }
        .tv-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div { opacity: 0.45; text-decoration: line-through; }
        .tv-editor .ProseMirror blockquote { border-left: 3px solid rgb(99 102 241 / 0.7); padding-left: 1rem; color: rgb(148 163 184); margin-left: 0; font-style: italic; }
        .tv-editor .ProseMirror pre { background: rgb(2 6 23); border: 1px solid rgb(30 41 59); border-radius: 0.6rem; padding: 0.75rem 1rem; overflow-x: auto; }
        .tv-editor .ProseMirror pre code { background: none; padding: 0; color: rgb(167 243 208); font-family: monospace; font-size: 0.8rem; border-radius: 0; }
        .tv-editor .ProseMirror code:not(pre code) { background: rgb(30 41 59); border-radius: 0.25rem; padding: 0.1em 0.35em; font-family: monospace; font-size: 0.82em; color: rgb(196 181 253); }
        .tv-editor .ProseMirror hr { border: none; border-top: 1px solid rgb(51 65 85); margin: 1rem 0; }
        .tv-editor .ProseMirror strong { font-weight: 700; color: white; }
        .tv-editor .ProseMirror em { font-style: italic; color: rgb(186 230 253); }
        .tv-editor .ProseMirror s  { text-decoration: line-through; opacity: 0.5; }
        .tv-editor .ProseMirror p.is-empty::before,
        .tv-editor .ProseMirror .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgb(51 65 85);
          pointer-events: none;
          float: left;
          height: 0;
        }
      `}</style>

      <div className={`tv-editor ${className}`} style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {!readOnly && slashState && slashItems.length > 0 && (
        <SlashMenu
          state={slashState}
          items={slashItems}
          selectedIndex={selectedIdx}
          onSelect={cmd => editor && doExecute(cmd, slashState, editor)}
        />
      )}
    </>
  );
}
