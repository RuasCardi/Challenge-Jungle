import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import type * as Primitives from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./button";
type Library = typeof Primitives;
let pending: Promise<Library> | undefined;
const load = () => (pending ??= import("@radix-ui/react-dialog"));
const Context = createContext<{
  library: Library | null;
  change: (open: boolean) => void;
}>({ library: null, change: () => {} });
export function Dialog({
  children,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ComponentProps<typeof Primitives.Root>) {
  const [internal, setInternal] = useState(defaultOpen);
  const [library, setLibrary] = useState<Library | null>(null);
  const open = controlled ?? internal;
  useEffect(() => {
    if (open && !library) {
      let active = true;
      void load().then((module) => {
        if (active) setLibrary(module);
      });
      return () => {
        active = false;
      };
    }
  }, [open, library]);
  const change = (next: boolean) => {
    setInternal(next);
    onOpenChange?.(next);
  };
  return (
    <Context.Provider value={{ library, change }}>
      {library ? (
        <library.Root {...props} open={open} onOpenChange={change}>
          {children}
        </library.Root>
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function DialogTrigger({
  children,
  asChild,
  onClick,
  ...props
}: ComponentProps<typeof Primitives.Trigger>) {
  const { library, change } = useContext(Context);
  if (library)
    return (
      <library.Trigger {...props} asChild={asChild} onClick={onClick}>
        {children}
      </library.Trigger>
    );
  const click: ComponentProps<"button">["onClick"] = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) change(true);
  };
  if (asChild) {
    const child = children as ReactElement<ComponentProps<"button">>;
    return cloneElement(child, {
      ...props,
      type: child.props.type ?? props.type ?? "button",
      "aria-haspopup": "dialog",
      onClick: (event) => {
        child.props.onClick?.(event);
        click(event);
      },
    });
  }
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-haspopup="dialog"
      onClick={click}
    >
      {children}
    </button>
  );
}
export function DialogClose(props: ComponentProps<typeof Primitives.Close>) {
  const { library } = useContext(Context);
  return library ? <library.Close {...props} /> : null;
}
export function DialogTitle(props: ComponentProps<typeof Primitives.Title>) {
  const { library } = useContext(Context);
  return library ? <library.Title {...props} /> : null;
}
export function DialogDescription(
  props: ComponentProps<typeof Primitives.Description>,
) {
  const { library } = useContext(Context);
  return library ? <library.Description {...props} /> : null;
}
export function DialogContent({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitives.Content>) {
  const { library } = useContext(Context);
  if (!library) return null;
  return (
    <library.Portal>
      <library.Overlay className="fixed inset-0 z-40 bg-black/75" />
      <library.Content
        className={cn(
          "dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-purple-300/25 bg-[#171321] p-6 shadow-xl",
          className,
        )}
        {...props}
      >
        {children}
        <library.Close
          className="iconbtn absolute right-3 top-3"
          aria-label="Fechar diálogo"
        >
          <X size={20} />
        </library.Close>
      </library.Content>
    </library.Portal>
  );
}
