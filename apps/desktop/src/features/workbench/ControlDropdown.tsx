import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

interface ControlDropdownProps<T extends string> {
  ariaLabel: string;
  buttonClassName: string;
  disabled?: boolean;
  menuClassName: string;
  menuLabel: string;
  onChange: (value: T) => void;
  optionClassName: string;
  options: readonly DropdownOption<T>[];
  rootClassName: string;
  value: T;
  renderValue?: (option: DropdownOption<T>) => ReactNode;
}

function moveIndex<T>(options: readonly T[], currentIndex: number, delta: number) {
  const nextIndex = currentIndex + delta;

  if (nextIndex < 0) {
    return options.length - 1;
  }

  if (nextIndex >= options.length) {
    return 0;
  }

  return nextIndex;
}

export default function ControlDropdown<T extends string>({
  ariaLabel,
  buttonClassName,
  disabled = false,
  menuClassName,
  menuLabel,
  onChange,
  optionClassName,
  options,
  rootClassName,
  value,
  renderValue,
}: ControlDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();

  const selectedIndex = useMemo(
    () => Math.max(options.findIndex((option) => option.value === value), 0),
    [options, value],
  );
  const selectedOption = options[selectedIndex] ?? options[0];

  function focusOption(index: number) {
    optionRefs.current[index]?.focus();
  }

  function openMenu(focusIndex = selectedIndex) {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    window.requestAnimationFrame(() => {
      focusOption(focusIndex);
    });
  }

  function closeMenu(returnFocus = true) {
    setIsOpen(false);

    if (returnFocus) {
      window.requestAnimationFrame(() => {
        buttonRef.current?.focus();
      });
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      closeMenu(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(selectedIndex);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(moveIndex(options, selectedIndex, -1));
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (isOpen) {
        closeMenu(false);
      } else {
        openMenu(selectedIndex);
      }
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeMenu();
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(moveIndex(options, index, 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(moveIndex(options, index, -1));
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }

    if (event.key === "Tab") {
      closeMenu(false);
    }
  }

  return (
    <div className={rootClassName} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`control ${buttonClassName}`}
        aria-label={ariaLabel}
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            closeMenu(false);
          } else {
            openMenu(selectedIndex);
          }
        }}
        onKeyDown={handleButtonKeyDown}
      >
        {renderValue ? renderValue(selectedOption) : selectedOption?.label}
        <span className="method-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <ul id={listId} className={menuClassName} role="listbox" aria-label={menuLabel}>
          {options.map((option, index) => (
            <li key={option.value}>
              <button
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`${optionClassName}${option.value === value ? " active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  closeMenu();
                }}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
