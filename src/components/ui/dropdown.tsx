"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePopper } from "react-popper";
import { cn } from "@/lib/utils";

export type DropdownHandle = { close: () => void };

export type DropdownProps = {
  button: ReactNode;
  children: ReactNode;
  btnClassName?: string;
  popperClassName?: string;
  placement?: "bottom-end" | "bottom-start" | "top-end" | "top-start" | "bottom" | "right-start" | "left-start";
  offset?: [number, number];
  disabled?: boolean;
  /** جعل قائمة الخيارات بنفس عرض الزر (مفيد للقوائم بعرض الشريط) */
  sameWidth?: boolean;
  /** يُستدعى عند فتح/إغلاق القائمة (مثلاً لدوران أيقونة السهم) */
  onOpenChange?: (open: boolean) => void;
};

const Dropdown = forwardRef<DropdownHandle, DropdownProps>(function Dropdown(
  props,
  forwardedRef
) {
  const [visible, setVisible] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const popperDomRef = useRef<HTMLDivElement | null>(null);

  const sameWidth = props.sameWidth ?? false;

  const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
    placement: props.placement ?? "bottom-end",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: props.offset ?? [0, 8],
        },
      },
    ],
  });

  useLayoutEffect(() => {
    if (!visible || !sameWidth || !referenceElement || !popperDomRef.current) return;
    const w = referenceElement.getBoundingClientRect().width;
    popperDomRef.current.style.width = `${w}px`;
    void update?.();
  }, [visible, sameWidth, referenceElement, update]);

  useEffect(() => {
    if (visible) {
      void update?.();
    }
  }, [visible, update]);

  const { onOpenChange } = props;
  useEffect(() => {
    onOpenChange?.(visible);
  }, [visible, onOpenChange]);

  useEffect(() => {
    if (!visible) return;
    const handleDocumentClick = (event: MouseEvent) => {
      const t = event.target as Node;
      if (referenceElement?.contains(t) || popperElement?.contains(t)) {
        return;
      }
      setVisible(false);
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [visible, referenceElement, popperElement]);

  useImperativeHandle(forwardedRef, () => ({
    close() {
      setVisible(false);
    },
  }));

  return (
    <>
      <button
        ref={setReferenceElement}
        type="button"
        disabled={props.disabled}
        className={props.btnClassName}
        onClick={() => {
          if (props.disabled) return;
          setVisible((v) => !v);
        }}
      >
        {props.button}
      </button>

      {visible && (
        <div
          ref={(el) => {
            setPopperElement(el);
            popperDomRef.current = el;
          }}
          style={styles.popper}
          {...attributes.popper}
          className={cn("z-50", props.popperClassName)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {props.children}
        </div>
      )}
    </>
  );
});

export default Dropdown;
